import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { join } from 'path';
import { router } from './routes/index.js';
import { clientManager } from './utils/helpers.js';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const PUBLIC_DIR = join(process.cwd(), 'public');
const CLIENTS_DIR = join(UPLOAD_DIR, 'clients');

console.log('UPLOAD_DIR:', UPLOAD_DIR);
console.log('CLIENTS_DIR:', CLIENTS_DIR);

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const clientSockets = new Map<string, WebSocket>();

wss.on('connection', (ws, req) => {
  const clientId = new URL(req.url || '', `http://${req.headers.host}`).searchParams.get('clientId');
  if (clientId) {
    clientSockets.set(clientId, ws);
    clientManager.touch(clientId);
    console.log(`WebSocket connected for client: ${clientId}`);
  }

  ws.on('close', () => {
    if (clientId) {
      clientSockets.delete(clientId);
      clientManager.cleanupClient(clientId);
      console.log(`Client ${clientId} disconnected, directory cleaned up`);
    }
  });
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/uploads/clients', express.static(CLIENTS_DIR));

app.use('/', router);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

async function start() {
  try {
    await clientManager.init();
    console.log('Client manager initialized');
    httpServer.listen(PORT, () => {
      console.log(`Glitch Kitchen running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
