import { join } from 'path';
import { existsSync } from 'fs';
import { mkdir, readdir, rm, unlink } from 'fs/promises';
import { clientManager, cleanClientDir, runMagick, runMagickOutput, ok, error } from '../utils/helpers';
import { buildMagickCommand } from '../utils/magick';
import type { Pipeline } from '../types/operations';

function isGifPath(p: string): boolean {
  return typeof p === 'string' && p.toLowerCase().endsWith('.gif');
}

export async function processPipeline(
  pipeline: Pipeline,
  input: string,
  outputPath: string,
  finalExt: string,
  clientDir: string
): Promise<{ success: boolean; error?: string; output: string }> {
  const { recipe, repeat = 1 } = pipeline;
  
  if (recipe.length === 0) {
    return { success: true, output: input };
  }
  
  const hasQuality = recipe.some(op => op.id === 'quality');
  const hasFormat = recipe.find(op => op.id === 'format')?.args.type as string;
  const ext = hasFormat || (hasQuality ? 'jpg' : finalExt);
  let currentInput = input;
  const tempFiles: string[] = [];
  
  try {
    for (let i = 0; i < repeat; i++) {
      const isLast = i === repeat - 1;
      const tempOutput = isLast ? outputPath : join(clientDir, `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${i}.${ext}`);
      if (!isLast) tempFiles.push(tempOutput);
      
      const magickArgs = buildMagickCommand(recipe);
      const result = await runMagick([currentInput, ...magickArgs, tempOutput]);
      
      if (!result.success) {
        return { success: false, error: result.error, output: '' };
      }
      
      if (!isLast) currentInput = tempOutput;
    }
    
    return { success: true, output: outputPath };
  } finally {
    await Promise.all(tempFiles.map(file => unlink(file).catch(() => {})));
  }
}

async function applyPipelines(
  inputFile: string,
  pipelines: Pipeline[],
  outputPath: string,
  finalExt: string,
  clientDir: string
): Promise<{ success: boolean; error?: string; output: string }> {
  let currentInput = inputFile;
  for (let i = 0; i < pipelines.length; i++) {
    const pipeline = pipelines[i];
    if (!pipeline) continue;
    const nextPipeline = pipelines[i + 1];
    const pipelineHasQuality = pipeline.recipe.some(op => op.id === 'quality');
    const pipelineHasFormat = pipeline.recipe.find(op => op.id === 'format')?.args.type as string;
    const nextHasFormat = nextPipeline?.recipe.find(op => op.id === 'format')?.args.type as string;
    const nextHasQuality = nextPipeline?.recipe.some(op => op.id === 'quality') as boolean;
    const pipelineExt = pipelineHasFormat || (pipelineHasQuality ? 'jpg' : (nextHasFormat || (nextHasQuality ? 'jpg' : finalExt)));

    const result = await processPipeline(pipeline, currentInput, outputPath, pipelineExt, clientDir);
    if (!result.success) return { success: false, error: result.error, output: '' };
    currentInput = result.output;
  }

  if (currentInput === inputFile) {
    const copy = await runMagick([currentInput, outputPath]);
    if (!copy.success) return { success: false, error: copy.error || 'Failed to copy image', output: '' };
  }

  return { success: true, output: outputPath };
}

async function processGifAnimated(
  inputFile: string,
  pipelines: Pipeline[],
  outputPath: string,
  clientDir: string
): Promise<{ success: boolean; error?: string; output: string }> {
  const framesDir = join(clientDir, `frames-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  await mkdir(framesDir, { recursive: true });

  try {
    const extract = await runMagick([inputFile, '-coalesce', join(framesDir, 'frame-%d.png')]);
    if (!extract.success) {
      return { success: false, error: extract.error || 'Failed to read GIF frames', output: '' };
    }

    const entries = await readdir(framesDir);
    const frames = entries
      .filter(f => /^frame-\d+\.png$/.test(f))
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)?.[0] || '0', 10);
        const nb = parseInt(b.match(/\d+/)?.[0] || '0', 10);
        return na - nb;
      })
      .map(f => join(framesDir, f));

    if (frames.length === 0) {
      return { success: false, error: 'No frames found in GIF', output: '' };
    }

    const delaysInfo = await runMagickOutput(['identify', '-format', '%T\n', inputFile]);
    const parsedDelays = (delaysInfo.output ?? '')
      .trim()
      .split('\n')
      .map(l => parseInt(l.trim(), 10));
    const delays = frames.map((_, i) => (parsedDelays[i] && parsedDelays[i] > 0 ? parsedDelays[i] : 10));

    const processed = await Promise.all(frames.map(async (frame, i) => {
      const frameOut = join(framesDir, `out-${i}.png`);
      const res = await applyPipelines(frame, pipelines, frameOut, 'png', clientDir);
      return res.success ? frameOut : null;
    }));

    const valid = processed.filter((f): f is string => f !== null);
    if (valid.length !== frames.length) {
      return { success: false, error: 'Failed to process GIF frames', output: '' };
    }

    const delayArgs = delays.flatMap(d => ['-delay', String(d)]);
    const combine = await runMagick(['-loop', '0', ...delayArgs, ...valid, outputPath]);
    if (!combine.success) {
      return { success: false, error: combine.error || 'Failed to merge GIF frames', output: '' };
    }

    return { success: true, output: outputPath };
  } finally {
    await rm(framesDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function processImages(inputPath: string | string[], pipelines: Pipeline[], clientId: string): Promise<Response> {
  const isArray = Array.isArray(inputPath);
  const paths = isArray ? inputPath : [inputPath];
  const clientDir = clientManager.getClientDir(clientId);
  
  const missing = paths.filter(p => !existsSync(join(clientDir, p)));
  if (missing.length > 0) {
    return ok({ success: false, error: `File not found: ${missing.join(', ')}`, outputs: [] });
  }
  
  await cleanClientDir(clientDir, paths);
  
  const hasAnimate = pipelines.some(p => p.recipe.some(op => op.id === 'animate'));
  
  if (hasAnimate && isArray && paths.length > 1) {
    const animatePipeline = pipelines.find(p => p.recipe.some(op => op.id === 'animate'));
    const animateOp = animatePipeline?.recipe.find(op => op.id === 'animate');
    const delay = (animateOp?.args.delay as number) || 10;
    const infinite = (animateOp?.args.infinite as string) === 'true';
    
    const inputFiles = paths.map(p => join(clientDir, p)).filter(existsSync);
    if (inputFiles.length < 2) {
      return error('Need at least 2 images for animation');
    }
    
    const outputPath = join(clientDir, `output-${Date.now()}.gif`);
    const delayStr = delay + '';
    const loopArg = infinite ? '0' : '1';
    
    const result = await runMagick([
      '-delay', delayStr,
      '-loop', loopArg,
      ...inputFiles,
      outputPath
    ]);
    
    if (!result.success) {
      return error(result.error || 'Failed to create animation');
    }
    
    const finalPipelines = pipelines.filter(p => !p.recipe.some(op => op.id === 'animate'));
    if (finalPipelines.length > 0) {
      const postResult = await processGifAnimated(outputPath, finalPipelines, outputPath, clientDir);
      if (!postResult.success) {
        return error(postResult.error || 'Failed to process animation');
      }
    }
    
    return ok({ success: true, output: `/uploads/clients/${clientId}/${outputPath.split('/').pop()}` });
  }
  
  const results = await Promise.all(paths.map(async (path, index) => {
    const inputFile = join(clientDir, path);
    if (!existsSync(inputFile)) return { success: false, error: `File not found: ${path}`, output: '' };

    const isGif = isGifPath(path);
    const lastRecipe = pipelines[pipelines.length - 1]?.recipe || [];
    const lastHasQuality = lastRecipe.some(op => op.id === 'quality');
    const explicitFormat = lastRecipe.find(op => op.id === 'format')?.args.type as string;
    const finalExt = isGif && !explicitFormat
      ? 'gif'
      : explicitFormat || (lastHasQuality ? 'jpg' : (isGif ? 'gif' : 'png'));
    const outputPath = join(clientDir, `output-${Date.now()}-${index}.${finalExt}`);

    let result: { success: boolean; error?: string; output: string };
    if (isGif) {
      result = finalExt === 'gif'
        ? await processGifAnimated(inputFile, pipelines, outputPath, clientDir)
        : await applyPipelines(`${inputFile}[0]`, pipelines, outputPath, finalExt, clientDir);
    } else {
      result = await applyPipelines(inputFile, pipelines, outputPath, finalExt, clientDir);
    }

    if (!result.success) return { success: false, error: result.error, output: '' };
    return { success: true, output: `/uploads/clients/${clientId}/${outputPath.split('/').pop()}` };
  }));
  
  const outputs = results.map(r => r.output).filter(Boolean);
  const errors = results.filter(r => !r.success).map(r => r.error);
  
  if (errors.length > 0) {
    return ok({ success: false, error: errors.join(', '), outputs });
  }
  
  if (isArray) {
    return ok({ success: true, outputs });
  }
  
  return ok({ success: true, output: outputs[0] });
}

export async function uploadImage(file: File, clientId: string): Promise<Response> {
  const clientDir = clientManager.getClientDir(clientId);
  const baseName = file.name.split('/').pop()?.split('\\').pop() || 'image';
  const filename = `${Date.now()}-${baseName}`;
  const { writeFile } = await import('fs/promises');
  await writeFile(join(clientDir, filename), Buffer.from(await file.arrayBuffer()));
  return ok({ id: filename.replace(/\.[^.]+$/, ''), filename, path: `/uploads/clients/${clientId}/${filename}` });
}
