import { spawn } from 'child_process';
import { mkdir, readdir, rm, stat, unlink, utimes } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = join(__dirname, '../../uploads');
export const CLIENTS_DIR = join(UPLOAD_DIR, 'clients');
export const PUBLIC_DIR = join(__dirname, '../../public');

const CLIENT_ID_PATTERN = /^cli-\d+-[a-z0-9]+$/;

export function isValidClientId(clientId: unknown): clientId is string {
  return typeof clientId === 'string' && CLIENT_ID_PATTERN.test(clientId);
}

class ClientManager {
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private readonly CLIENT_TTL = 10 * 60 * 1000;

  async init(): Promise<void> {
    await mkdir(CLIENTS_DIR, { recursive: true });
    await this.removeExpiredClients();
    this.startCleanup();
  }

  async createClient(): Promise<string> {
    const id = `cli-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    await mkdir(this.getClientDir(id), { recursive: true });
    return id;
  }

  getClientDir(clientId: string): string {
    if (!isValidClientId(clientId)) {
      throw new Error(`Invalid client id: ${clientId}`);
    }
    return join(CLIENTS_DIR, clientId);
  }

  async touch(clientId: string): Promise<void> {
    const clientDir = this.getClientDir(clientId);
    await mkdir(clientDir, { recursive: true });
    const now = new Date();
    await utimes(clientDir, now, now).catch(() => {});
  }

  async dispose(clientId: string): Promise<void> {
    await rm(this.getClientDir(clientId), { recursive: true, force: true }).catch(() => {});
  }

  async removeExpiredClients(): Promise<void> {
    const entries = await readdir(CLIENTS_DIR, { withFileTypes: true }).catch(() => []);
    const now = Date.now();

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const clientDir = join(CLIENTS_DIR, entry.name);
      const stats = await stat(clientDir).catch(() => null);
      if (stats && now - stats.mtimeMs > this.CLIENT_TTL) {
        await rm(clientDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  private startCleanup(): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      this.removeExpiredClients().catch((err) => console.error('Cleanup error:', err));
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

export async function cleanClientDir(clientDir: string, keepFiles: string[]): Promise<void> {
  const keep = new Set(keepFiles);
  const entries = await readdir(clientDir, { withFileTypes: true }).catch(() => []);

  await Promise.all(entries.map(async (entry) => {
    if (keep.has(entry.name)) return;
    const target = join(clientDir, entry.name);
    if (entry.isDirectory()) {
      await rm(target, { recursive: true, force: true }).catch(() => {});
    } else {
      await unlink(target).catch(() => {});
    }
  }));
}
