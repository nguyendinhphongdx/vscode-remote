import { watch, type FSWatcher } from 'chokidar';
import path from 'path';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import type { FsWatchEvent } from '../protocol.js';

type WatchCallback = (event: FsWatchEvent) => void;

let watcher: FSWatcher | null = null;
const callbacks = new Set<WatchCallback>();

export function startWatcher(): void {
  if (watcher) return;

  watcher = watch(config.workspaceRoot, {
    ignoreInitial: true,
    ignored: ['**/node_modules/**', '**/.git/**'],
    awaitWriteFinish: { stabilityThreshold: 100 },
  });

  const emit = (event: FsWatchEvent['event'], filePath: string) => {
    const relativePath = path.relative(config.workspaceRoot, filePath);
    const payload: FsWatchEvent = { event, path: relativePath };
    for (const cb of callbacks) {
      cb(payload);
    }
  };

  watcher.on('add', (p: string) => emit('add', p));
  watcher.on('change', (p: string) => emit('change', p));
  watcher.on('unlink', (p: string) => emit('unlink', p));
  watcher.on('addDir', (p: string) => emit('addDir', p));
  watcher.on('unlinkDir', (p: string) => emit('unlinkDir', p));
  watcher.on('error', (err: Error) => {
    logger.warn('File watcher error (skipped)', { error: err.message });
  });

  logger.info('File watcher started', { root: config.workspaceRoot });
}

export function onFileChange(callback: WatchCallback): () => void {
  callbacks.add(callback);
  return () => callbacks.delete(callback);
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
    callbacks.clear();
    logger.info('File watcher stopped');
  }
}
