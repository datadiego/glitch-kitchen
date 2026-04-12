import { Request, Response } from 'express';
import { operations } from '../data/operations.js';
import { processImages } from '../services/imageService.js';
import { clientManager } from '../utils/helpers.js';

export function getOperations(_req: Request, res: Response) {
  res.json(operations);
}

export async function handleCreateClient(_req: Request, res: Response) {
  const clientId = await clientManager.createClient();
  res.json({ clientId });
}

export async function handleProcessRequest(req: Request, res: Response) {
  const { inputPath, pipelines, clientId } = req.body;
  
  if (!inputPath || !pipelines || !Array.isArray(pipelines)) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  
  if (!clientId) {
    return res.status(400).json({ error: 'clientId required' });
  }
  
  clientManager.touch(clientId);
  const result = await processImages(inputPath, pipelines, clientId);
  res.json(result);
}

export function handleUpload(req: Request, res: Response) {
  const { clientId } = req.params;
  if (!clientId) {
    return res.status(400).json({ error: 'clientId required' });
  }
  
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No image provided' });
  }
  
  clientManager.touch(clientId);
  const filename = file.filename;
  const relativePath = `/uploads/clients/${clientId}/${filename}`;
  res.json({ 
    id: filename.replace(/\.[^.]+$/, ''), 
    filename, 
    path: relativePath 
  });
}
