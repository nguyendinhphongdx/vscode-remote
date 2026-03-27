import type { WebSocket } from 'ws';
import { MSG } from '@vscode-remote/shared';
import type { GitStagePayload, GitCommitPayload, GitDiffPayload } from '@vscode-remote/shared';
import * as gitService from '../services/gitService.js';
import { sendResponse } from './router.js';

export async function handleGitMessage(
  ws: WebSocket,
  id: string,
  type: string,
  payload?: unknown,
): Promise<void> {
  switch (type) {
    case MSG.GIT_STATUS: {
      const result = await gitService.getStatus();
      sendResponse(ws, id, type, true, result);
      break;
    }
    case MSG.GIT_STAGE: {
      const { path } = payload as GitStagePayload;
      await gitService.stageFile(path);
      sendResponse(ws, id, type, true);
      break;
    }
    case MSG.GIT_STAGE_ALL: {
      await gitService.stageAll();
      sendResponse(ws, id, type, true);
      break;
    }
    case MSG.GIT_UNSTAGE: {
      const { path } = payload as GitStagePayload;
      await gitService.unstageFile(path);
      sendResponse(ws, id, type, true);
      break;
    }
    case MSG.GIT_UNSTAGE_ALL: {
      await gitService.unstageAll();
      sendResponse(ws, id, type, true);
      break;
    }
    case MSG.GIT_DISCARD: {
      const { path } = payload as GitStagePayload;
      await gitService.discardFile(path);
      sendResponse(ws, id, type, true);
      break;
    }
    case MSG.GIT_COMMIT: {
      const { message } = payload as GitCommitPayload;
      const result = await gitService.commit(message);
      sendResponse(ws, id, type, true, result);
      break;
    }
    case MSG.GIT_DIFF: {
      const { path, staged } = payload as GitDiffPayload;
      const diff = await gitService.getDiff(path, staged);
      sendResponse(ws, id, type, true, { diff });
      break;
    }
  }
}
