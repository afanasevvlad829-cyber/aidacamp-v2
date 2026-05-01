# File-Level Locking System

Multi-agent distributed file locking system for coordinating concurrent editing in parallel worktree-based development.

## Overview

When multiple agents work in parallel on a shared codebase, conflicts arise when they modify the same files. This system prevents concurrent editing by implementing **file-level locks** that:

- Block commits when another agent has locked a file
- Auto-release locks when the agent successfully pushes
- Expire after 1 hour (configurable) to handle stale locks
- Store locks in `.claude/file-locks/` (shared across all worktrees)

## Architecture

### Lock Storage

Locks are stored as individual files in `~/.claude/file-locks/` (outside the git repository, shared across all worktrees):

```
~/.claude/file-locks/
├── 2e8f7c1d.lock       (src/components/hero/Mobile.astro)
├── 5c6df12e.lock       (astro.config.mjs)
└── 92c1ae7f.lock       (src/layouts/CorpLayout.astro)
```

**Lock filename format:** MD5 hash of file path (8 chars) + `.lock`

### Lock File Format

```
AGENT_ID=MacBook-Air-Vladimir.local-vladimirafanasev
SESSION_ID=.git
USER=vladimirafanasev
LOCKED_AT=2026-05-01T12:30:00Z
EXPIRES_AT=2026-05-01T13:30:00Z
GIT_COMMIT=a1b2c3d
FILE_PATH=src/components/hero/Mobile.astro
REASON=Refactoring hero component styling
PID=12345
```

### TTL (Time-To-Live)

Default: **3600 seconds (1 hour)**

Configure via environment:
```bash
LOCK_TTL=7200 bash scripts/file-lock-manager.sh acquire ...
```

### Lock Lifecycle

```
1. Agent X starts editing file
   └─ Lock acquired: file-lock-manager.sh acquire <file> "reason"
   └─ Lock file written to ~/.claude/file-locks/

2. Agent X commits & pushes
   └─ Pre-commit hook: checks if staged files are locked by OTHER agents
   └─ Post-push hook: auto-releases locks owned by agent X

3. Agent Y tries to edit same file (while X's lock active)
   └─ Pre-commit hook blocks commit
   └─ Error: "File locked by agent X, expires in 58 minutes"

4. Lock expires after 1 hour (if not manually released)
   └─ Cleanup tool removes stale lock file
   └─ Or git hash validation detects stale lock
```

## Integration Points

### Pre-Commit Hook

**File:** `scripts/git-hooks/pre-commit`

Checks if any staged file is locked by another agent BEFORE allowing commit:

```bash
# Automatically runs on: git commit
# Blocks if file is locked by different agent
# Allows if file is locked by current agent (can continue editing)
```

### Post-Push Hook

**File:** `scripts/git-hooks/post-push`

Auto-releases all locks owned by current agent AFTER successful push:

```bash
# Automatically runs on: git push
# Releases all locks owned by this agent
# Cleans up expired locks from other agents
```

## Usage

### Manual Lock Acquisition

Lock a file before starting extensive work (optional — locks auto-created on first commit):

```bash
bash scripts/acquire-file-lock.sh src/components/hero/Mobile.astro "Refactoring hero component"
```

### Check Lock Status

```bash
bash scripts/file-lock-manager.sh check src/components/hero/Mobile.astro
```

**Output if locked:**
```
❌ LOCKED: src/components/hero/Mobile.astro
   Locked by:   agent-a081b (session: seo-block1-technical)
   Expires at:  2026-05-01T13:30:00Z
   Reason:      Refactoring hero component styling
```

**Output if not locked:**
```
✅ NOT LOCKED: src/components/hero/Mobile.astro
```

### View All Active Locks

```bash
bash scripts/audit-file-locks.sh
```

**Output:**
```
🔒 FILE LOCK AUDIT REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTIVE LOCKS:
  1. src/components/hero/Mobile.astro
     Agent: agent-a081b (session: seo-block1-technical)
     Expires: 2026-05-01T13:30:00Z
     Reason: Refactoring hero component styling

  2. astro.config.mjs
     Agent: agent-5c6df (session: build-system)
     Expires: 2026-05-01T13:15:00Z
     Reason: Adding new import paths
```

### Manual Lock Release

Release a lock before push (optional — auto-released on push):

```bash
bash scripts/release-file-lock.sh src/components/hero/Mobile.astro
```

### Cleanup Expired Locks

Manually clean up locks older than TTL (auto-runs on post-push):

```bash
bash scripts/audit-file-locks.sh cleanup
```

### View Lock Statistics

```bash
bash scripts/audit-file-locks.sh stats
```

**Output:**
```
📊 LOCK STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total lock files: 3
Active locks: 2
Expired locks: 1
```

## Orchestrator Override

Master agent can force-release locks owned by other agents:

```bash
MASTER_AGENT=1 bash scripts/file-lock-manager.sh force-release src/components/hero/Mobile.astro
```

⚠️ **Use only when absolutely necessary** (e.g., unresponsive agent, stale PID).

## Protected Files

### Red Flags (Strict Locking)

High-impact files — single edit can break the entire site:

- `src/components/hero/Mobile.astro` — hero section responsive
- `src/components/booking/BookingBar.astro` — booking flow
- `src/pages/design-v2.astro` — design system page
- `astro.config.mjs` — build configuration
- `package.json` — dependencies
- `scripts/deploy.sh` — deployment script

### Yellow Flags (Advisory Locking)

Important files — edit requires caution but less critical:

- `src/components/corp/CorpNav.astro`
- `src/layouts/CorpLayout.astro`
- `src/pages/corp/**/*.astro`
- `.github/CODEOWNERS`

## Error Messages

### Pre-Commit Block (File Locked by Other Agent)

```
❌ CANNOT COMMIT: File(s) locked by another agent

❌ LOCKED: src/components/hero/Mobile.astro
   Locked by:   agent-a081b (session: seo-block1-technical)
   Expires at:  2026-05-01T13:30:00Z
   Reason:      Refactoring hero component styling

Action: Wait for lock to expire, or contact the locking agent.
```

### File Not Locked (Trying to Release)

```
⚠️  Lock not found: src/components/hero/Mobile.astro
```

### File Already Locked by Another Agent (Trying to Acquire)

```
❌ FILE LOCKED: src/components/hero/Mobile.astro
   Locked by:   agent-a081b
   Expires at:  2026-05-01T13:30:00Z
   Reason:      Refactoring hero component styling
```

## Workflows

### Standard Workflow (Agent Editing File)

```bash
# 1. Start editing (optional — lock on first commit)
bash scripts/acquire-file-lock.sh src/components/hero/Mobile.astro "Refactoring hero"

# 2. Make changes in editor

# 3. Commit changes
git add src/components/hero/Mobile.astro
git commit -m "refactor(hero): update Mobile component styling"

# 4. Push to origin
git push origin agent/my-branch

# 5. Lock auto-released on successful push ✅
# If you want to release manually before push:
# bash scripts/release-file-lock.sh src/components/hero/Mobile.astro
```

### Concurrent Edit Attempt

```bash
# Agent A: File is locked
git add src/components/hero/Mobile.astro
git commit -m "refactor(hero): update"

# ❌ Error: File locked by agent-xyz (expires in 45 minutes)
# Pre-commit hook blocks the commit

# Options:
# 1. Wait 45 minutes for lock to expire
# 2. Contact agent-xyz to ask them to push and release lock
# 3. Orchestrator: MASTER_AGENT=1 ... force-release
```

### Stale Lock (Agent Disappeared)

```bash
# Lock is 2+ hours old, but agent PID no longer running
bash scripts/audit-file-locks.sh stats

# Shows: Expired locks: 5

# Clean them up:
bash scripts/audit-file-locks.sh cleanup

# Or orchestrator force-release:
MASTER_AGENT=1 bash scripts/file-lock-manager.sh force-release src/components/hero/Mobile.astro
```

## Testing

Run the test suite to verify lock system is working:

```bash
bash scripts/test-file-locking.sh
```

**Output on success:**
```
✓ All tests passed!
```

## Troubleshooting

### Lock Not Appearing in Audit

**Symptom:** You acquired a lock but audit doesn't show it.

**Cause:** Lock file didn't write properly, or directory doesn't exist.

**Fix:**
```bash
# Ensure directory exists
mkdir -p ~/.claude/file-locks

# Re-acquire lock
bash scripts/acquire-file-lock.sh src/components/hero/Mobile.astro
```

### Can't Commit Because File Is Locked (But I Didn't Lock It)

**Symptom:** Pre-commit hook blocks with "File locked by agent X".

**Cause:** Another agent locked the file and hasn't pushed yet.

**Options:**
1. Wait for lock to expire (1 hour default)
2. Contact the other agent and ask them to push
3. If agent is unresponsive, orchestrator can force-release

### Lock File Stuck (Agent Crashed)

**Symptom:** Agent disappeared but lock is still active and not expired.

**Cause:** Agent PID died, but TTL hasn't elapsed yet.

**Fix:**
```bash
# View expiration time
bash scripts/audit-file-locks.sh audit

# Option 1: Wait for expiration + cleanup
bash scripts/audit-file-locks.sh cleanup

# Option 2: Orchestrator force-release
MASTER_AGENT=1 bash scripts/file-lock-manager.sh force-release src/components/hero/Mobile.astro
```

### Permission Denied on Lock Directory

**Symptom:** `mkdir: cannot create directory '~/.claude/file-locks': Permission denied`

**Cause:** Filesystem permission issue.

**Fix:**
```bash
# Check permissions
ls -ld ~/.claude/file-locks

# Ensure readable/writable
chmod 755 ~/.claude/file-locks
```

## Configuration

### Change TTL

```bash
# Acquire lock with 2-hour TTL (7200 seconds)
LOCK_TTL=7200 bash scripts/acquire-file-lock.sh src/components/hero/Mobile.astro

# Check uses TTL from lock file itself, not environment
```

### Custom Agent ID

By default, agent ID is `hostname-username`. Override if needed:

```bash
AGENT_ID=custom-agent-name bash scripts/acquire-file-lock.sh src/components/hero/Mobile.astro
```

## Implementation Details

### Atomic Lock Writing

Locks use atomic write pattern (write to temp file, then rename) to prevent race conditions:

```bash
temp_lock=$(mktemp "$lock_file.tmp.XXXXXX")
write_lock_file "$temp_lock" ...
mv "$temp_lock" "$lock_file"  # Atomic rename
```

### Expiration Check

ISO 8601 string comparison works for expiration (sorts alphabetically = sorts chronologically):

```bash
current="2026-05-01T12:35:00Z"
expires="2026-05-01T13:30:00Z"

# Simple string comparison
[[ "$expires" < "$current" ]]  # false (lock not expired)
```

### Git Hash Validation

Lock includes `GIT_COMMIT` to detect stale locks across branch changes:

```
Lock file says: GIT_COMMIT=a1b2c3d
Current HEAD: x9y8z7w6

If different, lock is stale (agent switched branches)
```

## Security Notes

- Lock files are plaintext in `~/.claude/file-locks/` (readable by all users)
- No cryptographic signing — relies on filesystem permissions and TTL expiration
- Suitable for coordinating cooperative multi-agent workflows on shared hardware
- Not suitable for adversarial environments (agents can always delete lock files)

## See Also

- [AGENT_INSTRUCTIONS.md](../MCP/AGENT_INSTRUCTIONS.md) — Full agent workflow guide
- [scripts/file-lock-manager.sh](../scripts/file-lock-manager.sh) — Core lock manager implementation
- [scripts/git-hooks/pre-commit](../scripts/git-hooks/pre-commit) — Pre-commit hook integration
- [scripts/git-hooks/post-push](../scripts/git-hooks/post-push) — Post-push hook integration
