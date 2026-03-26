import type { WebSocket } from 'ws';
import { MSG } from '../protocol.js';
import type {
  FsListPayload,
  FsReadPayload,
  FsWritePayload,
  FsCreatePayload,
  FsDeletePayload,
  FsRenamePayload,
  FsStatPayload,
} from '../protocol.js';
import * as fileService from '../services/fileService.js';
import { sendResponse } from './router.js';

export async function handleFsMessage(
  ws: WebSocket,
  id: string,
  type: string,
  payload: unknown
): Promise<void> {
  switch (type) {
    case MSG.FS_LIST: {
      const { path } = payload as FsListPayload;
      const entries = await fileService.listDirectory(path);
      sendResponse(ws, id, type, true, { entries });
      break;
    }
    case MSG.FS_READ: {
      const { path } = payload as FsReadPayload;
      const content = await fileService.readFile(path);
      sendResponse(ws, id, type, true, { path, content });
      break;
    }
    case MSG.FS_WRITE: {
      const { path, content } = payload as FsWritePayload;
      await fileService.writeFile(path, content);
      sendResponse(ws, id, type, true);
      break;
    }
    case MSG.FS_CREATE: {
      const { path, type: entryType } = payload as FsCreatePayload;
      await fileService.createEntry(path, entryType);
      sendResponse(ws, id, type, true);
      break;
    }
    case MSG.FS_DELETE: {
      const { path } = payload as FsDeletePayload;
      await fileService.deleteEntry(path);
      sendResponse(ws, id, type, true);
      break;
    }
    case MSG.FS_RENAME: {
      const { oldPath, newPath } = payload as FsRenamePayload;
      await fileService.renameEntry(oldPath, newPath);
      sendResponse(ws, id, type, true);
      break;
    }
    case MSG.FS_STAT: {
      const { path } = payload as FsStatPayload;
      const stat = await fileService.statFile(path);
      sendResponse(ws, id, type, true, { ...stat, path });
      break;
    }
  }
}
