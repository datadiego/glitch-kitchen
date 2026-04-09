import { serve } from 'bun';
import { join } from 'path';
import { existsSync } from 'fs';
import { UPLOAD_DIR, PUBLIC_DIR, CLIENTS_DIR, error } from './utils/helpers';
import { routes } from './routes/index';

const server = serve({
  port: 3000,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    console.log(`${req.method} ${pathname}`);

    if (pathname.startsWith('/uploads/clients/')) {
      const filepath = join(CLIENTS_DIR, pathname.replace('/uploads/clients/', ''));
      return existsSync(filepath) ? new Response(Bun.file(filepath)) : error('Not found', 404);
    }

    if (pathname.startsWith('/uploads/')) {
      const filepath = join(UPLOAD_DIR, pathname.replace('/uploads/', ''));
      return existsSync(filepath) ? new Response(Bun.file(filepath)) : error('Not found', 404);
    }

    if (pathname.startsWith('/api/')) {
      const route = routes.find(r => r.path === pathname && r.method === req.method);
      if (route) return route.handler(req);
      return error('Method not allowed', 405);
    }

    const filePath = join(PUBLIC_DIR, pathname === '/' ? '/index.html' : pathname);
    return existsSync(filePath) ? new Response(Bun.file(filePath)) : error('Not found', 404);
  },
});

console.log(`Glitch Kitchen running at http://localhost:${server.port}`);
