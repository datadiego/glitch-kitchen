let pipelines = [];
let inputFilenames = [];
let inputPaths = [];
let outputPaths = [];
let dragulaInstances = [];
let clientId = null;

async function initClient() {
  try {
    const res = await fetch('/api/client', { method: 'POST' });
    const data = await res.json();
    clientId = data.clientId;
  } catch (err) {
    console.error('Failed to init client:', err);
  }
}

async function loadOperations() {
  try {
    const res = await fetch('/api/operations');
    operations = await res.json();
    renderOperations();
  } catch (err) {
    console.error('Failed to load operations:', err);
  }
}

function addPipeline() {
  const pipeline = {
    id: Date.now(),
    name: `Pipeline ${pipelines.length + 1}`,
    repeat: 1,
    recipe: []
  };
  pipelines.push(pipeline);
  renderPipelines();
  updateBakeButton();
  triggerAutoBake();
}

function removePipeline(id) {
  pipelines = pipelines.filter(p => p.id !== id);
  renderPipelines();
  updateBakeButton();
  triggerAutoBake();
}

function renderPipelines() {
  const container = document.getElementById('pipelines-container');
  
  if (pipelines.length === 0) {
    container.innerHTML = '<div class="pipeline-hint">Click "Add Pipeline" to create your first pipeline</div>';
    return;
  }
  
  container.innerHTML = pipelines.map(pipeline => `
    <div class="pipeline" data-id="${pipeline.id}" data-dragula-handled="false">
      <div class="pipeline-header">
        <div class="pipeline-name">
          <input type="text" value="${pipeline.name}" data-pipeline="${pipeline.id}" class="pipeline-name-input" spellcheck="false">
          <label class="repeat-label">
            Repeat:
            <input type="number" value="${pipeline.repeat}" data-pipeline="${pipeline.id}" class="pipeline-repeat-input" min="1" max="100">
          </label>
        </div>
        <div class="pipeline-actions">
          <button class="clear-pipeline" data-pipeline="${pipeline.id}">Clear</button>
          <button class="remove-pipeline" data-pipeline="${pipeline.id}">×</button>
        </div>
      </div>
      <div class="recipe-dropzone" data-pipeline="${pipeline.id}">
        ${pipeline.recipe.length === 0 
          ? '<div class="recipe-hint">Drag operations here or double-click</div>'
          : pipeline.recipe.map((item, index) => renderRecipeStep(item, index, pipeline.id)).join('')
        }
      </div>
    </div>
  `).join('');
  
  container.querySelectorAll('.pipeline-name-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.pipeline);
      const pipeline = pipelines.find(p => p.id === id);
      if (pipeline) pipeline.name = e.target.value;
    });
  });
  
  container.querySelectorAll('.pipeline-repeat-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.pipeline);
      const pipeline = pipelines.find(p => p.id === id);
      if (pipeline) pipeline.repeat = parseInt(e.target.value) || 1;
      triggerAutoBake();
    });
  });
  
  container.querySelectorAll('.clear-pipeline').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.pipeline);
      const pipeline = pipelines.find(p => p.id === id);
      if (pipeline) {
        pipeline.recipe = [];
        renderPipelines();
        updateBakeButton();
        triggerAutoBake();
      }
    });
  });
  
  container.querySelectorAll('.remove-pipeline').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.pipeline);
      removePipeline(id);
    });
  });
  
  setupDragula();
  setupRecipeStepEvents();
}

function renderRecipeStep(item, index, pipelineId) {
  const op = operations.find(o => o.id === item.id);
  if (!op) return '';
  
  const colorsArg = op.args.find(arg => arg.type === 'colors');
  const otherArgs = op.args.filter(arg => arg.type !== 'colors');
  
  return `
    <div class="recipe-step" data-index="${index}" data-pipeline="${pipelineId}">
      <span class="recipe-step-num">${index + 1}</span>
      <span class="recipe-step-name">${op.name}</span>
      <div class="recipe-step-args">
        ${otherArgs.map(arg => `
          <div class="arg-inline">
            <label>${arg.label}:</label>
            ${arg.type === 'select' 
              ? `<select name="${arg.name}" data-index="${index}" data-pipeline="${pipelineId}">
                  ${arg.options.map(opt => `<option value="${opt}" ${item.args[arg.name] === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                 </select>`
              : `<input type="text" name="${arg.name}" data-index="${index}" data-pipeline="${pipelineId}" 
                  value="${item.args[arg.name]}" 
                  placeholder="${arg.min !== undefined ? `${arg.min}:${arg.max}` : 'min:max'}"
                  autocomplete="off" />`
            }
          </div>
        `).join('')}
        ${colorsArg ? (() => {
          const colors = Array.isArray(item.args[colorsArg.name]) ? item.args[colorsArg.name] : [item.args[colorsArg.name] || '#FFFFFF'];
          const maxColors = colorsArg.maxColors || 16;
          return `
            <div class="arg-colors" data-index="${index}" data-pipeline="${pipelineId}" data-arg="${colorsArg.name}" data-max="${maxColors}">
              <label>${colorsArg.label}:</label>
              <div class="colors-row">
                <div class="colors-list">${colors.map((color, i) => `
                  <div class="color-item" data-color-index="${i}" draggable="true">
                    <input type="color" value="${color}" />
                    <button class="remove-color" type="button" ${colors.length <= 2 ? 'disabled' : ''}>×</button>
                  </div>
                `).join('')}</div>
                <button class="add-color-btn" type="button" ${colors.length >= maxColors ? 'disabled' : ''}>+ Add Color</button>
              </div>
            </div>
          `;
        })() : ''}
      </div>
      <button class="recipe-step-remove" data-index="${index}" data-pipeline="${pipelineId}">×</button>
    </div>
  `;
}

let isReorderingPipelines = false;

function setupDragula() {
  dragulaInstances.forEach(d => d.destroy());
  dragulaInstances = [];
  
  const operationsList = document.getElementById('operations-list');
  const pipelinesContainer = document.getElementById('pipelines-container');
  const dropzones = document.querySelectorAll('.recipe-dropzone');
  
  const pipelineDrake = dragula([pipelinesContainer], {
    moves: (el, source, handle) => {
      return el.classList.contains('pipeline') && handle.closest('.pipeline-header') !== null;
    },
    accepts: (el, source, target) => {
      return target === pipelinesContainer;
    },
    revertOnSpill: true,
    ignoreInputText: true
  });
  
  pipelineDrake.on('drop', (el, target, source, sibling) => {
    if (!target || target !== pipelinesContainer) return;
    if (!el.classList.contains('pipeline')) return;
    
    if (isReorderingPipelines) return;
    isReorderingPipelines = true;
    
    setTimeout(() => {
      const pipelineElements = Array.from(pipelinesContainer.children).filter(c => c.classList.contains('pipeline'));
      const currentIds = pipelineElements.map(p => parseInt(p.dataset.id));
      
      if (JSON.stringify(currentIds) !== JSON.stringify(pipelines.map(p => p.id))) {
        const newOrder = currentIds
          .map(id => pipelines.find(p => p.id === id))
          .filter(Boolean);
        pipelines = newOrder;
        renderPipelines();
        triggerAutoBake();
      }
      isReorderingPipelines = false;
    }, 0);
  });
  
  const drake = dragula([operationsList, ...dropzones], {
    copy: (el, source) => source === operationsList,
    moves: (el, source, handle) => {
      if (el.classList.contains('pipeline')) return false;
      return true;
    },
    accepts: (el, source, target) => {
      if (!target) return false;
      return target === operationsList || target.classList.contains('recipe-dropzone');
    },
    copySortSource: false,
    revertOnSpill: true,
    ignoreInputText: true
  });
  
  drake.on('drop', (el, target, source, sibling) => {
    if (!target) return;
    
    if (target === operationsList) {
      if (source !== operationsList) {
        const pipelineId = parseInt(source.dataset.pipeline);
        const pipeline = pipelines.find(p => p.id === pipelineId);
        if (pipeline) {
          const opIndex = parseInt(el.dataset.index);
          pipeline.recipe.splice(opIndex, 1);
        }
        el.remove();
        renderPipelines();
        updateBakeButton();
        triggerAutoBake();
      }
      renderOperations();
      return;
    }
    
    const pipelineId = parseInt(target.dataset.pipeline);
    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;
    
    const hint = target.querySelector('.recipe-hint');
    if (hint) hint.remove();
    
    const opId = el.dataset.id;
    
    if (source === operationsList) {
      if (!opId) return;
      
      const op = operations.find(o => o.id === opId);
      if (!op) return;
      
      const args = {};
      op.args.forEach(arg => {
        args[arg.name] = arg.default;
      });
      
      let toIndex = pipeline.recipe.length;
      
      if (sibling && sibling.classList && sibling.classList.contains('recipe-step')) {
        const steps = Array.from(target.children).filter(c => c.classList.contains('recipe-step'));
        toIndex = steps.indexOf(sibling);
      }
      
      pipeline.recipe.splice(toIndex, 0, { id: op.id, args });
      el.remove();
    } else {
      let movedItem = null;
      
      if (source.dataset.pipeline !== target.dataset.pipeline) {
        const sourcePipeline = pipelines.find(p => p.id === parseInt(source.dataset.pipeline));
        if (sourcePipeline) {
          const opIndex = parseInt(el.dataset.index);
          movedItem = sourcePipeline.recipe[opIndex];
          sourcePipeline.recipe.splice(opIndex, 1);
        }
      } else {
        const oldIndex = parseInt(el.dataset.index);
        movedItem = pipeline.recipe[oldIndex];
        pipeline.recipe.splice(oldIndex, 1);
      }
      
      if (movedItem) {
        let toIndex = pipeline.recipe.length;
        
        if (sibling && sibling.classList.contains('recipe-step')) {
          toIndex = parseInt(sibling.dataset.index);
        }
        
        pipeline.recipe.splice(toIndex, 0, movedItem);
      }
    }
    
    renderPipelines();
    updateBakeButton();
    triggerAutoBake();
  });
  
  dragulaInstances.push(pipelineDrake);
  dragulaInstances.push(drake);
}

function setupRecipeStepEvents() {
  document.querySelectorAll('.recipe-step-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      const pipelineId = parseInt(e.target.dataset.pipeline);
      const pipeline = pipelines.find(p => p.id === pipelineId);
      if (pipeline) {
        pipeline.recipe.splice(index, 1);
        renderPipelines();
        updateBakeButton();
        triggerAutoBake();
      }
    });
  });
  
  document.querySelectorAll('.recipe-step-args input, .recipe-step-args select').forEach(input => {
    const handleChange = () => {
      const index = parseInt(input.dataset.index);
      const pipelineId = parseInt(input.dataset.pipeline);
      const pipeline = pipelines.find(p => p.id === pipelineId);
      if (!pipeline) return;
      
      const argName = input.name;
      const value = input.type === 'select' ? input.value : input.value;
      pipeline.recipe[index].args[argName] = value;
      
      clearTimeout(window.autoBakeTimer);
      window.autoBakeTimer = setTimeout(() => {
        triggerAutoBake();
      }, 300);
    };
    
    input.addEventListener('change', handleChange);
    input.addEventListener('input', handleChange);
  });
  
  document.querySelectorAll('.arg-colors').forEach(container => {
    const list = container.querySelector('.colors-list');
    if (!list) return;
    
    const index = parseInt(container.dataset.index);
    const pipelineId = parseInt(container.dataset.pipeline);
    const argName = container.dataset.arg;
    const maxColors = parseInt(container.dataset.max);
    
    container.addEventListener('click', (e) => {
      const pipeline = pipelines.find(p => p.id === pipelineId);
      if (!pipeline) return;
      
      const colors = [...pipeline.recipe[index].args[argName]];
      
      if (e.target.classList.contains('add-color-btn')) {
        if (colors.length < maxColors) {
          colors.push('#808080');
          pipeline.recipe[index].args[argName] = colors;
          renderColorItems(list, container, index, pipelineId, argName, maxColors);
          triggerAutoBake();
        }
      }
      
      if (e.target.classList.contains('remove-color')) {
        const item = e.target.closest('.color-item');
        const colorIndex = parseInt(item.dataset.colorIndex);
        if (colors.length > 2) {
          colors.splice(colorIndex, 1);
          pipeline.recipe[index].args[argName] = colors;
          renderColorItems(list, container, index, pipelineId, argName, maxColors);
          triggerAutoBake();
        }
      }
    });
    
    list.addEventListener('input', (e) => {
      if (e.target.type === 'color') {
        const pipeline = pipelines.find(p => p.id === pipelineId);
        if (!pipeline) return;
        
        const item = e.target.closest('.color-item');
        const colorIndex = parseInt(item.dataset.colorIndex);
        const colors = [...pipeline.recipe[index].args[argName]];
        colors[colorIndex] = e.target.value;
        pipeline.recipe[index].args[argName] = colors;
        
        clearTimeout(window.autoBakeTimer);
        window.autoBakeTimer = setTimeout(() => {
          triggerAutoBake();
        }, 300);
      }
    }, true);
  });
  
  setupColorsDragula();
}

let colorDragulaInstances = [];

function setupColorsDragula() {
  colorDragulaInstances.forEach(d => d.destroy());
  colorDragulaInstances = [];
  
  document.querySelectorAll('.colors-list').forEach(list => {
    const container = list.closest('.arg-colors');
    const index = parseInt(container.dataset.index);
    const pipelineId = parseInt(container.dataset.pipeline);
    const argName = container.dataset.arg;
    const maxColors = parseInt(container.dataset.max);
    
    const drake = dragula([list], {
      moves: (el, source, handle) => {
        return el.classList.contains('color-item');
      }
    });
    
    drake.on('drop', (el, target) => {
      const items = Array.from(target.querySelectorAll('.color-item'));
      const newColors = items.map(item => {
        const input = item.querySelector('input[type="color"]');
        return input ? input.value : '#FFFFFF';
      });
      
      const pipeline = pipelines.find(p => p.id === pipelineId);
      if (pipeline) {
        pipeline.recipe[index].args[argName] = newColors;
        renderColorItems(list, container, index, pipelineId, argName, maxColors);
        triggerAutoBake();
      }
    });
    
    colorDragulaInstances.push(drake);
  });
}

function renderColorItems(list, container, index, pipelineId, argName, maxColors) {
  const pipeline = pipelines.find(p => p.id === pipelineId);
  if (!pipeline) return;
  
  const colors = Array.isArray(pipeline.recipe[index].args[argName]) 
    ? pipeline.recipe[index].args[argName] 
    : [pipeline.recipe[index].args[argName] || '#FFFFFF'];
  
  list.innerHTML = colors.map((color, i) => `
    <div class="color-item" data-color-index="${i}" draggable="true">
      <input type="color" value="${color}" />
      <button class="remove-color" type="button" ${colors.length <= 2 ? 'disabled' : ''}>×</button>
    </div>
  `).join('');
}

function renderOperations() {
  const container = document.getElementById('operations-list');
  container.innerHTML = '';
  
  const searchTerm = document.getElementById('search').value.toLowerCase();
  
  operations
    .filter(op => op.name.toLowerCase().includes(searchTerm))
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(op => {
      const item = document.createElement('div');
      item.className = 'op-item';
      item.dataset.id = op.id;
      item.innerHTML = `
        <h4>${op.name}</h4>
        <p>${op.description}</p>
      `;
      
      item.addEventListener('dblclick', () => {
        if (pipelines.length === 0) {
          addPipeline();
        }
        const pipeline = pipelines[pipelines.length - 1];
        const args = {};
        op.args.forEach(arg => {
          args[arg.name] = arg.default;
        });
        pipeline.recipe.push({ id: op.id, args });
        renderPipelines();
        updateBakeButton();
        triggerAutoBake();
      });
      
      container.appendChild(item);
    });
}

function addToRecipe(id) {
  const op = operations.find(o => o.id === id);
  if (!op) return;
  
  if (pipelines.length === 0) {
    addPipeline();
  }
  
  const pipeline = pipelines[pipelines.length - 1];
  const args = {};
  op.args.forEach(arg => {
    args[arg.name] = arg.default;
  });
  
  pipeline.recipe.push({ id: op.id, args });
  renderPipelines();
  updateBakeButton();
  triggerAutoBake();
}

function updateBakeButton() {
  const btn = document.getElementById('bake-btn');
  const hasOperations = pipelines.some(p => p.recipe.length > 0);
  btn.disabled = !hasOperations;
}

function triggerAutoBake() {
  if (document.getElementById('auto-bake')?.checked && inputFilenames.length > 0 && pipelines.some(p => p.recipe.length > 0)) {
    bake();
  }
}

function playNotificationSound() {
  if (document.getElementById('sound-enabled')?.checked) {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(err => console.log('Audio play failed:', err));
  }
}

let currentInput = null;

async function handleImageUpload(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;
  
  inputFilenames = [];
  inputPaths = [];
  
  const previewContainer = document.getElementById('input-preview');
  previewContainer.innerHTML = '<div class="multi-preview"></div>';
  const multiPreview = previewContainer.querySelector('.multi-preview');
  
  for (const file of files) {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const res = await fetch(`/api/upload?clientId=${clientId}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      inputFilenames.push(data.filename);
      inputPaths.push(data.path);
      
      const img = document.createElement('img');
      img.src = data.path;
      img.alt = file.name;
      multiPreview.appendChild(img);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  }
  
  updateBakeButton();
  triggerAutoBake();
}

async function bake() {
  if (!pipelines.some(p => p.recipe.length > 0)) return;
  if (inputFilenames.length === 0) return;
  if (!clientId) return;
  
  document.title = 'baking...';
  
  const btn = document.getElementById('bake-btn');
  btn.classList.add('loading');
  
  let randomStr = Math.random().toString(36).slice(2, 10);
  btn.textContent = randomStr;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*▓▒░⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬╱╲╳';
  const interval = setInterval(() => {
    const idx = Math.floor(Math.random() * 8);
    const newChar = chars[Math.floor(Math.random() * chars.length)];
    randomStr = randomStr.slice(0, idx) + newChar + randomStr.slice(idx + 1);
    btn.textContent = randomStr;
  }, 10);
  
  const outputEl = document.getElementById('output-preview');
  outputEl.innerHTML = '';
  
  try {
    const res = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputPath: inputFilenames.length === 1 ? inputFilenames[0] : inputFilenames,
        pipelines: pipelines,
        clientId: clientId
      })
    });
    
    const data = await res.json();
    
    if (data.success) {
      outputPaths = [];
      if (data.outputs) {
        outputPaths = data.outputs;
        outputEl.innerHTML = data.outputs.map(path => `<img src="${path}" alt="Output" />`).join('');
      } else if (data.output) {
        outputPaths = [data.output];
        outputEl.innerHTML = `<img src="${data.output}" alt="Output" />`;
      }
      outputEl.classList.remove('error');
      playNotificationSound();
    } else {
      outputEl.innerHTML = `<span class="error-msg">Error: ${data.error}</span>`;
      outputEl.classList.add('error');
    }
  } catch (err) {
    outputEl.innerHTML = `<span class="error-msg">Error: ${err.message}</span>`;
    outputEl.classList.add('error');
  } finally {
    clearInterval(interval);
    btn.classList.remove('loading');
    btn.textContent = 'Bake!';
    document.title = 'ready!';
  }
}

document.getElementById('search').addEventListener('input', renderOperations);
document.getElementById('image-input').addEventListener('change', handleImageUpload);
document.getElementById('bake-btn').addEventListener('click', bake);
document.getElementById('add-pipeline-btn').addEventListener('click', addPipeline);
document.getElementById('auto-bake').addEventListener('change', () => {
  triggerAutoBake();
});

document.getElementById('menu-btn').addEventListener('click', () => {
  document.getElementById('menu-modal').classList.add('open');
});

document.getElementById('close-menu').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('menu-modal').classList.remove('open');
});

document.getElementById('menu-modal').addEventListener('click', (e) => {
  if (e.target.id === 'menu-modal') {
    document.getElementById('menu-modal').classList.remove('open');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const recipeStep = e.target.closest('.recipe-step');
    if (recipeStep) {
      e.target.blur();
      triggerAutoBake();
    } else if (!e.target.matches('input, select, textarea')) {
      bake();
    }
  }
});

document.getElementById('output-preview').addEventListener('click', (e) => {
  const img = e.target.closest('img');
  if (img) {
    const modal = document.getElementById('img-modal');
    const modalImg = document.getElementById('modal-img');
    modalImg.src = img.src;
    modal.classList.add('open');
  }
});

window.closeModal = function() {
  document.getElementById('img-modal').classList.remove('open');
};

loadOperations();
loadPipelineList();
initClient();

addPipeline();

document.getElementById('input-preview').addEventListener('click', (e) => {
  const img = e.target.closest('img');
  if (img) {
    inputFilenames = [];
    inputPaths = [];
    document.getElementById('input-preview').innerHTML = `
      <label for="image-input" class="upload-btn">Upload Image</label>
    `;
    document.getElementById('image-input').value = '';
    updateBakeButton();
  }
});

document.getElementById('save-btn').addEventListener('click', () => {
  const state = { pipelines: pipelines };
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'glitch-kitchen.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('load-btn').addEventListener('click', () => {
  document.getElementById('load-input').click();
});

document.getElementById('load-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const state = JSON.parse(event.target.result);
      if (state.pipelines) {
        pipelines = state.pipelines;
        renderPipelines();
        updateBakeButton();
        triggerAutoBake();
      }
    } catch (err) {
      console.error('Failed to load state:', err);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && document.title === 'ready!') {
    document.title = 'glitch-kitchen';
  }
});

async function loadPipelineList() {
  try {
    const res = await fetch('/api/pipelines');
    const files = await res.json();
    const select = document.getElementById('pipeline-select');
    const selected = select.dataset.selected || '';
    select.innerHTML = '<option value="">Load Pipeline</option>';
    files.forEach(file => {
      const option = document.createElement('option');
      option.value = file;
      option.textContent = file.replace('.json', '');
      if (file === selected) option.selected = true;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Failed to load pipeline list:', err);
  }
}

document.getElementById('pipeline-select').addEventListener('change', async (e) => {
  const file = e.target.value;
  if (!file) return;
  
  try {
    const res = await fetch(`/pipelines/${file}`);
    const state = await res.json();
    if (state.pipelines) {
      pipelines = state.pipelines;
      renderPipelines();
      updateBakeButton();
      triggerAutoBake();
      select.dataset.selected = file;
    }
  } catch (err) {
    console.error('Failed to load pipeline:', err);
  }
});

document.getElementById('download-output-btn').addEventListener('click', () => {
  outputPaths.forEach((path, index) => {
    const a = document.createElement('a');
    a.href = path;
    a.download = `output-${index + 1}.png`;
    a.click();
  });
});

document.getElementById('use-output-as-input-btn').addEventListener('click', async () => {
  if (outputPaths.length === 0) return;
  
  inputFilenames = [];
  inputPaths = [];
  
  const previewContainer = document.getElementById('input-preview');
  previewContainer.innerHTML = '<div class="multi-preview"></div>';
  const multiPreview = previewContainer.querySelector('.multi-preview');
  
  for (const path of outputPaths) {
    const response = await fetch(path);
    const blob = await response.blob();
    const filename = path.split('/').pop();
    const file = new File([blob], filename, { type: blob.type });
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const res = await fetch(`/api/upload?clientId=${clientId}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      inputFilenames.push(data.filename);
      inputPaths.push(data.path);
      
      const img = document.createElement('img');
      img.src = data.path;
      img.alt = filename;
      multiPreview.appendChild(img);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  }
  
  updateBakeButton();
  triggerAutoBake();
});

document.getElementById('download-script-btn').addEventListener('click', async () => {
  if (!pipelines.some(p => p.recipe.length > 0)) {
    alert('Add some operations to your pipeline first!');
    return;
  }

  try {
    const res = await fetch('/api/download-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipelines })
    });

    if (!res.ok) {
      throw new Error('Failed to generate script');
    }

    const script = await res.text();
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'glitch-kitchen.sh';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download script failed:', err);
    alert('Failed to generate script');
  }
});
