import { getOperations, handleProcessRequest, handleUpload, handleCreateClient } from '../controllers/imageController';
import { generateScript } from '../utils/magick';
import * as fs from 'fs';
import * as path from 'path';

export interface Route {
  path: string;
  method: string;
  handler: (req: Request) => Promise<Response>;
}

async function getPipelines(): Promise<Response> {
  const pipelinesDir = path.join(process.cwd(), 'public', 'pipelines');
  
  try {
    const files = fs.readdirSync(pipelinesDir).filter(f => f.endsWith('.json'));
    return new Response(JSON.stringify(files), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleDownloadScript(req: Request): Promise<Response> {
  try {
    const { pipelines } = await req.json();
    
    if (!pipelines || !Array.isArray(pipelines)) {
      return new Response(JSON.stringify({ error: 'Invalid pipelines' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const script = generateScript(pipelines);
    
    return new Response(script, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename="glitch-kitchen.sh"'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to generate script' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const routes: Route[] = [
  { path: '/api/operations', method: 'GET', handler: async () => getOperations() },
  { path: '/api/client', method: 'POST', handler: handleCreateClient },
  { path: '/api/process', method: 'POST', handler: handleProcessRequest },
  { path: '/api/upload', method: 'POST', handler: handleUpload },
  { path: '/api/pipelines', method: 'GET', handler: async () => getPipelines() },
  { path: '/api/download-script', method: 'POST', handler: handleDownloadScript },
];
