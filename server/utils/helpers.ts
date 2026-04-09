import { spawn } from 'child_process';
import { mkdir, readdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = join(__dirname, '../../uploads');
export const CLIENTS_DIR = join(UPLOAD_DIR, 'clients');
export const PUBLIC_DIR = join(__dirname, '../../public');

class ClientManager {
  private clients = new Map<string, { id: string; lastActive: number }>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private readonly CLIENT_TTL = 30 * 60 * 1000;

  async init(): Promise<void> {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
    if (!existsSync(CLIENTS_DIR)) {
      await mkdir(CLIENTS_DIR, { recursive: true });
    }
    this.startCleanup();
  }

  async createClient(): Promise<string> {
    const id = `cli-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const clientDir = join(CLIENTS_DIR, id);
    await mkdir(clientDir, { recursive: true });
    this.clients.set(id, { id, lastActive: Date.now() });
    return id;
  }

  getClientDir(clientId: string): string {
    return join(CLIENTS_DIR, clientId);
  }

  touch(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastActive = Date.now();
    }
  }

  async cleanup(clientId: string): Promise<void> {
    const clientDir = this.getClientDir(clientId);
    const files = await readdir(clientDir).catch(() => []);
    await Promise.all(files.map(async (file) => {
      await unlink(join(clientDir, file)).catch(() => {});
    }));
    this.clients.delete(clientId);
  }

  private startCleanup(): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(async () => {
      const now = Date.now();
      for (const [id, client] of this.clients) {
        if (now - client.lastActive > this.CLIENT_TTL) {
          const clientDir = this.getClientDir(id);
          await rm(clientDir, { recursive: true, force: true }).catch(() => {});
          this.clients.delete(id);
        }
      }
    }, 60 * 1000);
  }
}

export const clientManager = new ClientManager();

(async () => {
  await clientManager.init();
})();

export const error = (msg: string, status = 400) => Response.json({ error: msg }, { status });
export const ok = (data: unknown) => Response.json(data);

export async function runMagick(args: string[]): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const proc = spawn('magick', args, { shell: false });
    let stderr = '';
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    proc.on('close', (code) => resolve({ success: code === 0, error: stderr }));
    proc.on('error', (err) => resolve({ success: false, error: err.message }));
  });
}

export async function cleanupUploads(keepFiles?: string | string[]) {
  try {
    const files = await readdir(UPLOAD_DIR);
    const keepList = Array.isArray(keepFiles) ? keepFiles : keepFiles ? [keepFiles] : [];
    await Promise.all(files.map(async (file) => {
      if (!keepList.includes(file)) {
        await unlink(join(UPLOAD_DIR, file)).catch(() => {});
      }
    }));
  } catch (err) { console.error('Cleanup error:', err); }
}
