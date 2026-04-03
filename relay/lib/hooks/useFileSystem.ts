"use client";

import { useCallback } from "react";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { useFileStore } from "@/store/fileStore";
import { MSG, type FsListResponse, type FsReadResponse, type FsStatResponse } from '@vscode-remote/shared';

export function useFileSystem() {
  const { ws } = useWebSocket();
  const { setChildren } = useFileStore();

  const listDirectory = useCallback(
    async (path: string) => {
      if (!ws) return [];
      const result = await ws.send<FsListResponse>(MSG.FS_LIST, { path });
      setChildren(path, result.entries);
      return result.entries;
    },
    [ws, setChildren]
  );

  const readFile = useCallback(
    async (path: string) => {
      if (!ws) return "";
      const result = await ws.send<FsReadResponse>(MSG.FS_READ, { path });
      return result.content;
    },
    [ws]
  );

  const writeFile = useCallback(
    async (path: string, content: string) => {
      if (!ws) return;
      await ws.send(MSG.FS_WRITE, { path, content });
    },
    [ws]
  );

  const createEntry = useCallback(
    async (path: string, type: "file" | "directory") => {
      if (!ws) return;
      await ws.send(MSG.FS_CREATE, { path, type });
    },
    [ws]
  );

  const deleteEntry = useCallback(
    async (path: string) => {
      if (!ws) return;
      await ws.send(MSG.FS_DELETE, { path });
    },
    [ws]
  );

  const renameEntry = useCallback(
    async (oldPath: string, newPath: string) => {
      if (!ws) return;
      await ws.send(MSG.FS_RENAME, { oldPath, newPath });
    },
    [ws]
  );

  const statFile = useCallback(
    async (path: string): Promise<FsStatResponse> => {
      if (!ws) return { exists: false, path };
      return await ws.send<FsStatResponse>(MSG.FS_STAT, { path });
    },
    [ws]
  );

  return { listDirectory, readFile, writeFile, createEntry, deleteEntry, renameEntry, statFile };
}
