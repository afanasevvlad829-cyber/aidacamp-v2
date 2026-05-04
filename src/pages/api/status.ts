export const prerender = false;
import type { APIRoute } from 'astro';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

interface LockFile {
  path: string;
  agentId: string;
  sessionId: string;
  lockedAt: string;
  expiresAt: string;
  reason: string;
  isExpired: boolean;
  minutesRemaining: number;
}

interface BranchInfo {
  name: string;
  ahead: number;
  behind: number;
  lastCommitTime: string;
  lastCommitAuthor: string;
}

interface StatusResponse {
  timestamp: string;
  locks: LockFile[];
  branches: BranchInfo[];
  deployStatus: {
    lastDeployTime: string | null;
    environment: 'dev' | 'prod' | 'unknown';
    buildStatus: 'clean' | 'dirty' | 'unknown';
  };
  summary: {
    activeLocksCount: number;
    staleLocksCount: number;
    branchesAheadOfDev: number;
    buildHealthy: boolean;
  };
}

async function getActiveLocks(): Promise<LockFile[]> {
  const locksDir = join(process.cwd(), '.claude', 'file-locks');
  const locks: LockFile[] = [];

  try {
    const files = await readdir(locksDir);
    const now = new Date();

    for (const file of files) {
      if (!file.endsWith('.lock')) continue;

      try {
        const content = await readFile(join(locksDir, file), 'utf-8');
        const lines = content.split('\n');
        const lockData: Record<string, string> = {};

        lines.forEach(line => {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length) {
            lockData[key.trim()] = valueParts.join('=').trim();
          }
        });

        const expiresAt = new Date(lockData.EXPIRES_AT || '');
        const lockedAt = new Date(lockData.LOCKED_AT || '');
        const isExpired = now > expiresAt;
        const minutesRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 60000));

        locks.push({
          path: lockData.FILE_PATH || 'unknown',
          agentId: lockData.AGENT_ID || 'unknown',
          sessionId: lockData.SESSION_ID || 'unknown',
          lockedAt: lockedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          reason: lockData.REASON || 'no reason given',
          isExpired,
          minutesRemaining,
        });
      } catch {
        // Skip malformed lock files
      }
    }
  } catch {
    // locks directory doesn't exist or is unreadable
  }

  return locks;
}

function getBranchStatus(): BranchInfo[] {
  try {
    const output = execSync('git branch -vv --format="%(refname:short)|%(upstream:track)|%(committerdate:iso8601)|%(authorname)"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    return output
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [name, track, date, author] = line.split('|');
        const ahead = (track.match(/ahead (\d+)/)?.[1] || '0');
        const behind = (track.match(/behind (\d+)/)?.[1] || '0');

        return {
          name: name.trim(),
          ahead: parseInt(ahead, 10),
          behind: parseInt(behind, 10),
          lastCommitTime: new Date(date.trim()).toISOString(),
          lastCommitAuthor: author.trim() || 'unknown',
        };
      });
  } catch {
    return [];
  }
}

function getDeployStatus() {
  try {
    // Check last deploy marker (if exists)
    const deployLog = execSync('git log --all --grep="deploy:" --format="%ai" -1', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    // Check current branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    // Check git status
    const gitStatus = execSync('git status --porcelain', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    return {
      lastDeployTime: deployLog ? new Date(deployLog).toISOString() : null,
      environment: currentBranch === 'main' ? 'prod' : currentBranch === 'dev' ? 'dev' : 'unknown',
      buildStatus: gitStatus.length === 0 ? 'clean' : 'dirty',
    };
  } catch {
    return {
      lastDeployTime: null,
      environment: 'unknown' as const,
      buildStatus: 'unknown' as const,
    };
  }
}

export const GET: APIRoute = async () => {
  const locks = await getActiveLocks();
  const branches = getBranchStatus();
  const deployStatus = getDeployStatus();

  const activeLocks = locks.filter(l => !l.isExpired);
  const staleLocks = locks.filter(l => l.isExpired);
  const branchesAheadOfDev = branches.filter(b => b.ahead > 0 && b.name !== 'dev').length;
  const buildHealthy = deployStatus.buildStatus === 'clean';

  const response: StatusResponse = {
    timestamp: new Date().toISOString(),
    locks,
    branches,
    deployStatus,
    summary: {
      activeLocksCount: activeLocks.length,
      staleLocksCount: staleLocks.length,
      branchesAheadOfDev,
      buildHealthy,
    },
  };

  return new Response(JSON.stringify(response, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
