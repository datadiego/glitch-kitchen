import { operations } from '../data/operations';
import { processImages, uploadImage } from '../services/imageService';
import type { Pipeline } from '../types/operations';
import { error, ok, clientManager } from '../utils/helpers';

export async function getOperations() {
  return ok(operations);
}

export async function handleCreateClient(): Promise<Response> {
  const clientId = await clientManager.createClient();
  return ok({ clientId });
}

export async function handleProcessRequest(req: Request): Promise<Response> {
  const body = await req.json() as { inputPath?: string | string[]; pipelines?: Pipeline[]; clientId?: string };
  const inputPath = body.inputPath;
  const pipelines = body.pipelines;
  const clientId = body.clientId;
  
  if (!inputPath || !pipelines || !Array.isArray(pipelines)) {
    return error('Missing parameters');
  }
  
  if (!clientId) {
    return error('clientId required');
  }
  
  clientManager.touch(clientId);
  return processImages(inputPath, pipelines, clientId);
}

export async function handleUpload(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const clientId = url.searchParams.get('clientId');
  if (!clientId) return error('clientId required');
  
  const file = (await req.formData()).get('image') as File;
  if (!file) return error('No image provided');
  
  clientManager.touch(clientId);
  return uploadImage(file, clientId);
}
