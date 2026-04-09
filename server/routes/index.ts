import { getOperations, handleProcessRequest, handleUpload, handleCreateClient } from '../controllers/imageController';

export interface Route {
  path: string;
  method: string;
  handler: (req: Request) => Promise<Response>;
}

export const routes: Route[] = [
  { path: '/api/operations', method: 'GET', handler: async () => getOperations() },
  { path: '/api/client', method: 'POST', handler: handleCreateClient },
  { path: '/api/process', method: 'POST', handler: handleProcessRequest },
  { path: '/api/upload', method: 'POST', handler: handleUpload },
];
