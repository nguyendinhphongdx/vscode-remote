import type { WebSocket } from 'ws';
import { MSG } from '@vscode-remote/shared';
import type {
  TerminalCreatePayload,
  TerminalInputPayload,
  TerminalResizePayload,
  TerminalClosePayload,
} from '@vscode-remote/shared';
import * as ptyService from '../services/ptyService.js';
import { sendResponse, sendEvent } from './router.js';

export async function handleTerminalMessage(
  ws: WebSocket,
  id: string,
  type: string,
  payload: unknown
): Promise<void> {
  switch (type) {
    case MSG.TERMINAL_SHELLS: {
      const shells = ptyService.getAvailableShells();
      const defaultShell = shells[0]?.path || '';
      sendResponse(ws, id, type, true, { shells, default: defaultShell });
      break;
    }
    case MSG.TERMINAL_CREATE: {
      const { cols, rows, shell } = payload as TerminalCreatePayload;
      const terminalId = ptyService.createTerminal(
        cols,
        rows,
        shell,
        (data) => sendEvent(ws, MSG.TERMINAL_OUTPUT, { terminalId, data }),
        (exitCode) => sendEvent(ws, MSG.TERMINAL_EXIT, { terminalId, exitCode })
      );
      sendResponse(ws, id, type, true, { terminalId });
      break;
    }
    case MSG.TERMINAL_INPUT: {
      const { terminalId, data } = payload as TerminalInputPayload;
      ptyService.writeToTerminal(terminalId, data);
      break;
    }
    case MSG.TERMINAL_RESIZE: {
      const { terminalId, cols, rows } = payload as TerminalResizePayload;
      ptyService.resizeTerminal(terminalId, cols, rows);
      break;
    }
    case MSG.TERMINAL_CLOSE: {
      const { terminalId } = payload as TerminalClosePayload;
      ptyService.closeTerminal(terminalId);
      sendResponse(ws, id, type, true);
      break;
    }
  }
}
