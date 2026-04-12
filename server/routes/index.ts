import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { join } from 'path';
import { readdirSync } from 'fs';
import { getOperations, handleProcessRequest, handleCreateClient, handleUpload } from '../controllers/imageController.js';
import { generateScript } from '../utils/magick.js';
import { clientManager } from '../utils/helpers.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const clientId = (req.params as any).clientId;
    console.log('Upload destination for client:', clientId);
    if (!clientId) {
      cb(new Error('clientId required'), '');
      return;
    }
    const clientDir = clientManager.getClientDir(clientId);
    cb(null, clientDir);
  },
  filename: (_req, file, cb) => {
    const filename = `${Date.now()}-${file.originalname}`;
    console.log('Saving file as:', filename);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.get('/api/operations', getOperations);
router.post('/api/client', handleCreateClient);
router.post('/api/process', handleProcessRequest);
router.post('/api/upload/:clientId', (req: Request, res: Response, next: NextFunction) => {
  console.log('Upload request received for client:', req.params.clientId);
  upload.single('image')(req, res, (err: any) => {
    if (err) {
      console.error('Multer error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, handleUpload);

router.get('/api/pipelines', (_req: Request, res: Response) => {
  const pipelinesDir = join(process.cwd(), 'public', 'pipelines');
  try {
    const files = readdirSync(pipelinesDir).filter(f => f.endsWith('.json'));
    res.json(files);
  } catch {
    res.json([]);
  }
});

router.post('/api/download-script', (req: Request, res: Response) => {
  try {
    const { pipelines } = req.body;
    if (!pipelines || !Array.isArray(pipelines)) {
      return res.status(400).json({ error: 'Invalid pipelines' });
    }
    const script = generateScript(pipelines);
    res.type('text/plain').attachment('glitch-kitchen.sh').send(script);
  } catch {
    res.status(500).json({ error: 'Failed to generate script' });
  }
});

export { router };
