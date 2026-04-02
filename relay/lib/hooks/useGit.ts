"use client";

import { useCallback } from "react";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { useGitStore } from "@/store/gitStore";
import { MSG, type GitStatusResponse, type GitCommitResponse, type GitPushResponse, type GitPullResponse } from '@vscode-remote/shared';

export function useGit() {
  const { ws } = useWebSocket();
  const { setStatus } = useGitStore();

  const refreshStatus = useCallback(async () => {
    if (!ws) return;
    try {
      const result = await ws.send<GitStatusResponse>(MSG.GIT_STATUS, {});
      setStatus(result.branch, result.entries);
    } catch {
      // Not a git repo or git not available
    }
  }, [ws, setStatus]);

  const stageFile = useCallback(async (path: string) => {
    if (!ws) return;
    await ws.send(MSG.GIT_STAGE, { path });
    await refreshStatus();
  }, [ws, refreshStatus]);

  const stageAll = useCallback(async () => {
    if (!ws) return;
    await ws.send(MSG.GIT_STAGE_ALL, {});
    await refreshStatus();
  }, [ws, refreshStatus]);

  const unstageFile = useCallback(async (path: string) => {
    if (!ws) return;
    await ws.send(MSG.GIT_UNSTAGE, { path });
    await refreshStatus();
  }, [ws, refreshStatus]);

  const unstageAll = useCallback(async () => {
    if (!ws) return;
    await ws.send(MSG.GIT_UNSTAGE_ALL, {});
    await refreshStatus();
  }, [ws, refreshStatus]);

  const discardFile = useCallback(async (path: string) => {
    if (!ws) return;
    await ws.send(MSG.GIT_DISCARD, { path });
    await refreshStatus();
  }, [ws, refreshStatus]);

  const commit = useCallback(async (message: string) => {
    if (!ws) return null;
    const result = await ws.send<GitCommitResponse>(MSG.GIT_COMMIT, { message });
    await refreshStatus();
    return result;
  }, [ws, refreshStatus]);

  const push = useCallback(async () => {
    if (!ws) return null;
    const result = await ws.send<GitPushResponse>(MSG.GIT_PUSH, {});
    await refreshStatus();
    return result;
  }, [ws, refreshStatus]);

  const pull = useCallback(async () => {
    if (!ws) return null;
    const result = await ws.send<GitPullResponse>(MSG.GIT_PULL, {});
    await refreshStatus();
    return result;
  }, [ws, refreshStatus]);

  return {
    refreshStatus,
    stageFile,
    stageAll,
    unstageFile,
    unstageAll,
    discardFile,
    commit,
    push,
    pull,
  };
}
