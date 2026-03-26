import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_PATH = path.resolve(__dirname, '../../public/index.html');

let cachedHtml: string | null = null;

export function serveAdminUi(_req: Request, res: Response): void {
  const accept = _req.headers.accept || '';
  if (!accept.includes('text/html')) {
    res.json({ status: 'ok', message: 'VS Code Remote Agent. Open in browser for admin UI.' });
    return;
  }

  if (!cachedHtml) {
    try {
      cachedHtml = fs.readFileSync(HTML_PATH, 'utf-8');
    } catch {
      res.status(500).send('Admin UI not found');
      return;
    }
  }

  res.type('html').send(cachedHtml);
}
