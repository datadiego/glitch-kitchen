import { join } from 'path';
import { existsSync } from 'fs';
import { UPLOAD_DIR, clientManager, runMagick, ok, error } from '../utils/helpers';
import { buildMagickCommand } from '../utils/magick';
import type { Pipeline } from '../types/operations';

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
  
  const ext = recipe.find(op => op.id === 'format')?.args.type as string || finalExt;
  let currentInput = input;
  
  for (let i = 0; i < repeat; i++) {
    const isLast = i === repeat - 1;
    const tempOutput = isLast ? outputPath : join(clientDir, `temp-${Date.now()}-${i}.${ext}`);
    
    const magickArgs = buildMagickCommand(recipe);
    const result = await runMagick([currentInput, ...magickArgs, tempOutput]);
    
    if (!result.success) {
      return { success: false, error: result.error, output: '' };
    }
    
    if (!isLast) currentInput = tempOutput;
  }
  
  return { success: true, output: outputPath };
}

export async function processImages(inputPath: string | string[], pipelines: Pipeline[], clientId: string): Promise<Response> {
  const isArray = Array.isArray(inputPath);
  const paths = isArray ? inputPath : [inputPath];
  const clientDir = clientManager.getClientDir(clientId);
  
  const results = await Promise.all(paths.map(async (path, index) => {
    const inputFile = join(clientDir, path);
    if (!existsSync(inputFile)) return { success: false, error: `File not found: ${path}`, output: '' };
    
    const finalExt = pipelines[pipelines.length - 1]?.recipe?.find(op => op.id === 'format')?.args.type as string || 'png';
    const outputPath = join(clientDir, `output-${Date.now()}-${index}.${finalExt}`);
    
    let currentInput = inputFile;
    for (let i = 0; i < pipelines.length; i++) {
      const pipeline = pipelines[i];
      if (!pipeline) continue;
      const nextPipeline = pipelines[i + 1];
      const pipelineExt = pipeline.recipe.find(op => op.id === 'format')?.args.type as string 
        || (nextPipeline?.recipe.find(op => op.id === 'format')?.args.type as string)
        || finalExt;
      
      const result = await processPipeline(pipeline, currentInput, outputPath, pipelineExt, clientDir);
      if (!result.success) return { success: false, error: result.error, output: '' };
      currentInput = result.output;
    }
    
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
  const filename = `${Date.now()}-${file.name}`;
  const { writeFile } = await import('fs/promises');
  await writeFile(join(clientDir, filename), Buffer.from(await file.arrayBuffer()));
  return ok({ id: filename.replace(/\.[^.]+$/, ''), filename, path: `/uploads/clients/${clientId}/${filename}` });
}
