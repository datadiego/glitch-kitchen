import { getOperations, handleProcessRequest, handleUpload, handleCreateClient } from '../controllers/imageController';
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

export const routes: Route[] = [
  { path: '/api/operations', method: 'GET', handler: async () => getOperations() },
  { path: '/api/client', method: 'POST', handler: handleCreateClient },
  { path: '/api/process', method: 'POST', handler: handleProcessRequest },
  { path: '/api/upload', method: 'POST', handler: handleUpload },
  { path: '/api/pipelines', method: 'GET', handler: async () => getPipelines() },
];
