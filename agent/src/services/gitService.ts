import { execFile } from 'child_process';
import { promisify } from 'util';
import { config } from '../config.js';
import type { GitFileStatus, GitStatusEntry } from '@vscode-remote/shared';

const execFileAsync = promisify(execFile);

async function git(...args: string[]): Promise<string> {
  const { stdout, stderr } = await execFileAsync('git', args, {
    cwd: config.workspaceRoot || undefined,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout || stderr;
}

export async function getStatus(): Promise<{ branch: string; entries: GitStatusEntry[] }> {
  // Get branch name
  let branch = '';
  try {
    branch = (await git('rev-parse', '--abbrev-ref', 'HEAD')).trim();
  } catch {
    // Not a git repo or no commits
    branch = '';
  }

  // Get status with porcelain v1 format
  let statusOutput = '';
  try {
    statusOutput = await git('status', '--porcelain', '-u');
  } catch {
    return { branch, entries: [] };
  }

  const entries: GitStatusEntry[] = [];

  for (const line of statusOutput.split('\n')) {
    if (!line) continue;

    const indexStatus = line[0];
    const workTreeStatus = line[1];
    const filePath = line.slice(3);

    // Handle renamed files: "R  old -> new"
    const actualPath = filePath.includes(' -> ')
      ? filePath.split(' -> ')[1]
      : filePath;

    // Staged changes (index)
    if (indexStatus !== ' ' && indexStatus !== '?') {
      entries.push({
        path: actualPath,
        status: indexStatus as GitFileStatus,
        staged: true,
      });
    }

    // Unstaged changes (work tree)
    if (workTreeStatus !== ' ') {
      if (indexStatus === '?') {
        // Untracked
        entries.push({
          path: actualPath,
          status: '?',
          staged: false,
        });
      } else {
        entries.push({
          path: actualPath,
          status: workTreeStatus as GitFileStatus,
          staged: false,
        });
      }
    }
  }

  return { branch, entries };
}

export async function stageFile(filePath: string): Promise<void> {
  await git('add', '--', filePath);
}

export async function stageAll(): Promise<void> {
  await git('add', '-A');
}

export async function unstageFile(filePath: string): Promise<void> {
  await git('reset', 'HEAD', '--', filePath);
}

export async function unstageAll(): Promise<void> {
  await git('reset', 'HEAD');
}

export async function discardFile(filePath: string): Promise<void> {
  // Check if file is untracked
  try {
    await git('ls-files', '--error-unmatch', filePath);
    // Tracked file - restore it
    await git('checkout', '--', filePath);
  } catch {
    // Untracked file - remove it
    await git('clean', '-f', '--', filePath);
  }
}

export async function commit(message: string): Promise<{ hash: string; summary: string }> {
  const output = await git('commit', '-m', message);
  const hashMatch = output.match(/\[[\w/-]+ ([a-f0-9]+)\]/);
  return {
    hash: hashMatch?.[1] || '',
    summary: output.split('\n')[0],
  };
}

export async function push(): Promise<{ summary: string }> {
  const output = await git('push');
  return { summary: output.trim() || 'Push completed' };
}

export async function pull(): Promise<{ summary: string }> {
  const output = await git('pull');
  return { summary: output.trim() || 'Already up to date' };
}

export async function getDiff(filePath: string, staged: boolean): Promise<string> {
  try {
    const args = staged ? ['diff', '--cached', '--', filePath] : ['diff', '--', filePath];
    return await git(...args);
  } catch {
    // For untracked files, show the file content as diff
    try {
      const content = await git('show', `:${filePath}`);
      return content;
    } catch {
      return '';
    }
  }
}
