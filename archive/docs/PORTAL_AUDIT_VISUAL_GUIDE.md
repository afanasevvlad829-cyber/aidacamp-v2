# 🎬 Portal Audit with Visible Browsers — Complete Guide

## Overview

**Full Portal Audit Dashboard** with **5 visible browser windows** + **DevTools** + **Real-time status monitoring**.

Instead of headless agents (black box), you now get:
- ✅ **5 browser windows** open simultaneously showing what each agent does
- ✅ **DevTools open** in each window (Console, Network, Elements)
- ✅ **Real-time status** updates in the main dashboard
- ✅ **Live log feed** of all agent activity
- ✅ **Unified findings** with CRITICAL/HIGH/MEDIUM/LOW severity

---

## 🚀 Quick Start

### Local Development

```bash
# 1. Start dev server
npm run dev

# 2. Open dashboard
open http://localhost:3000/admin/portal-audit-visual

# 3. Click "START FULL AUDIT"
# Watch 5 browser windows open with live agents running
```

### Production Setup

```bash
# 1. SSH to server
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55

# 2. Install tmux (if not already installed)
apt-get install -y tmux xvfb chromium-browser

# 3. Deploy script
scp -i ~/.ssh/aidacamp_prod scripts/run-visible-audit.sh \
  root@159.194.223.55:/opt/scripts/

# 4. Make executable
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  'chmod +x /opt/scripts/run-visible-audit.sh'

# 5. Deploy frontend
npm run build
rsync -avz -e "ssh -i ~/.ssh/aidacamp_prod" \
  dist/client/* \
  root@159.194.223.55:/var/www/aidacamp-dev/
```

---

## 📺 Dashboard Features

### Control Panel
```
┌────────────────────────────────────────┐
│ [🟢 START FULL AUDIT] [🛑 STOP] [📷 SCREENSHOTS] │
├────────────────────────────────────────┤
│ Status: RUNNING                        │
│ Elapsed: 04:23                         │
│ Agents Active: 3/5                     │
│ Issues Found: 8                        │
└────────────────────────────────────────┘
```

### 5 Agent Windows Grid
```
┌─────────────────┬─────────────────┐
│ Code Security   │ OAuth Testing   │
│ [browser view]  │ [browser view]  │
│ ✅ completed    │ ⏳ running 67%  │
└─────────────────┴─────────────────┘

┌─────────────────┬─────────────────┐
│ Performance     │ Input Validation│
│ [browser view]  │ [browser view]  │
│ ⏳ running 45%  │ ⏳ running 32%  │
└─────────────────┴─────────────────┘

┌─────────────────┬─────────────────┐
│ Database Sec    │ DevTools Console│
│ [browser view]  │ [log output]    │
│ ⏸️  pending     │ [live logs...]  │
└─────────────────┴─────────────────┘
```

### Findings Summary
```
┌────────────────────────────────────────┐
│ CRITICAL: 3  │  HIGH: 5  │  MEDIUM: 8 │
│ LOW: 2       │  PASSED: 15            │
├────────────────────────────────────────┤
│ 🔴 Dual-cabinet vulnerability (OAuth) │
│ 🔴 Race condition in signup endpoint  │
│ 🔴 Missing CSRF tokens in auth forms  │
│ 🟠 Weak rate limiting on /signin      │
│ [...]                                  │
└────────────────────────────────────────┘
```

---

## 🎯 What Each Agent Does

### Agent 1: Code Security Audit (Port 3001)
**Duration:** 5-7 minutes

Files analyzed:
- `backend/open_webui/routers/auths.py` — authentication endpoints
- `backend/open_webui/utils/oauth.py` — OAuth callback handlers
- `backend/open_webui/config.py` — configuration defaults

Checks:
- ✅ DUAL-CABINET bug (OAuth + synthetic email → 2 accounts)
- ✅ Race conditions in signup flow
- ✅ SQL injection / XSS vulnerabilities
- ✅ CSRF token protection
- ✅ JWT token lifecycle

Browser shows:
- Code snippets in DevTools
- Logic flow analysis
- Vulnerability highlighting

---

### Agent 2: OAuth Provider Testing (Port 3002)
**Duration:** 3-5 minutes

Tests:
- ✅ Telegram OAuth: email claim behavior
- ✅ Google OAuth: email + picture claims
- ✅ GitHub OAuth: login + avatar
- ✅ `ENABLE_OAUTH_EMAIL_FALLBACK` check
- ✅ `OAUTH_MERGE_ACCOUNTS_BY_EMAIL` verification
- ✅ Dual-account risk assessment

Browser shows:
- OAuth flow requests in Network tab
- Email claims received/missing
- Configuration environment variables
- Account creation scenarios

---

### Agent 3: Performance & DOS Audit (Port 3003)
**Duration:** 4-6 minutes

Checks:
- ✅ Rate limiting on `/signin`
- ✅ Brute-force protection effectiveness
- ✅ Query performance analysis
- ✅ Lighthouse scoring (Performance, SEO, Accessibility)
- ✅ CAPTCHA presence

Browser shows:
- Lighthouse audit report
- Network waterfall analysis
- Request timing metrics
- Performance bottlenecks

---

### Agent 4: Input Validation & XSS/SQLi (Port 3004)
**Duration:** 5-8 minutes

Tests:
- ✅ Email validation edge cases
- ✅ Password handling security
- ✅ XSS payloads: `<img src=x onerror=alert(1)>`
- ✅ SQL injection: `' OR '1'='1`
- ✅ Unicode/null-byte handling
- ✅ CSRF token verification

Browser shows:
- Form submission attempts
- Error messages
- DevTools Console for XSS verification
- Response analysis

---

### Agent 5: Database Security (Port 3005)
**Duration:** 3-4 minutes

SQL Checks:
- ✅ Email uniqueness constraints
- ✅ OAuth sub uniqueness
- ✅ Orphaned data detection
- ✅ Transaction isolation
- ✅ Audit logging

Browser shows:
- SSH terminal with SQL queries
- Query results
- Database constraints info
- Audit log entries

---

## 🔧 How It Works

### Architecture

```
┌─────────────────────────────────────────────────┐
│ Dashboard UI (portal-audit-visual.astro)        │
│ - Start button                                  │
│ - 5 agent window frames (iframes)              │
│ - Real-time status polling                      │
│ - Findings summary                              │
└──────────┬──────────────────────────────────────┘
           │
           │ Starts audit
           ↓
┌─────────────────────────────────────────────────┐
│ API Endpoint (/api/admin/portal-audit-progress) │
│ - Polls /tmp/portal-audit-runs/<runId>/         │
│ - Returns real-time agent status                │
│ - Aggregates findings                           │
└──────────┬──────────────────────────────────────┘
           │
           │ Spawns
           ↓
┌─────────────────────────────────────────────────┐
│ run-visible-audit.sh                            │
│ - Creates tmux session                          │
│ - Starts 5 Chrome windows with DevTools         │
│ - Launches Claude agents in parallel            │
│ - Streams logs to audit.log                     │
└──────────┬──────────────────────────────────────┘
           │
           ├─ Agent 1 (tmux window 1) → Port 3001
           ├─ Agent 2 (tmux window 2) → Port 3002
           ├─ Agent 3 (tmux window 3) → Port 3003
           ├─ Agent 4 (tmux window 4) → Port 3004
           └─ Agent 5 (tmux window 5) → Port 3005
```

### Real-Time Flow

```
User clicks "START FULL AUDIT"
        ↓
Dashboard calls: POST /api/admin/portal-audit
        ↓
API spawns: bash /opt/scripts/run-visible-audit.sh
        ↓
Script creates tmux session with 5 windows
        ↓
Each window opens Chrome on localhost:300X
        ↓
Claude agents start running in parallel
        ↓
Every 2 seconds, dashboard polls:
  GET /api/admin/portal-audit-progress
        ↓
API reads: /tmp/portal-audit-runs/<runId>/status.json
        ↓
Dashboard updates in real-time:
  - Agent status bars
  - Issue counters
  - DevTools console feed
        ↓
After ~10 minutes:
  All agents complete → status = "completed"
        ↓
Download JSON report or view in browser
```

---

## 📊 Findings JSON Structure

```json
{
  "audit_timestamp": "2026-06-01T12:34:56Z",
  "portal": "https://ai.aidacamp.ru",
  "status": "completed",
  "summary": "Full security audit with 5 visible agents",
  "agents": 5,
  "findings": [
    {
      "severity": "CRITICAL",
      "title": "Dual-cabinet vulnerability",
      "agent": "Code Security Audit",
      "location": "oauth.py:1630",
      "description": "One user can have 2 separate accounts: one via password signup, another via OAuth (with synthetic email from ENABLE_OAUTH_EMAIL_FALLBACK)",
      "reproduction": "1. Sign up with email+password\n2. Sign in via Telegram OAuth (same synthetic email)\n3. Two separate user accounts exist",
      "fix": "Set OAUTH_MERGE_ACCOUNTS_BY_EMAIL=True to merge accounts by email, or disable ENABLE_OAUTH_EMAIL_FALLBACK"
    },
    {
      "severity": "HIGH",
      "title": "Weak rate limiting",
      "agent": "Performance & DOS Audit",
      "location": "/signin endpoint",
      "description": "Rate limiting allows 100 requests per minute from same IP",
      "fix": "Reduce to 5 attempts per minute, add exponential backoff"
    }
  ],
  "summary_counts": {
    "CRITICAL": 3,
    "HIGH": 5,
    "MEDIUM": 8,
    "LOW": 2,
    "PASSED": 15
  }
}
```

---

## 🔐 Access Control

Dashboard is restricted to admin IPs in nginx:

```nginx
location /admin/portal-audit-visual {
    allow 37.113.209.255;    # Your IP
    allow 127.0.0.1;         # Localhost for dev
    deny all;
}
```

---

## 📱 Usage Examples

### Web Browser

```
1. Navigate: https://dev.aidacamp.ru/admin/portal-audit-visual
2. Click: "START FULL AUDIT"
3. Watch: 5 agent windows open with DevTools
4. View: Real-time status updates
5. Download: JSON report when complete
```

### Manual CLI

```bash
# Start audit manually
/opt/scripts/run-visible-audit.sh my-audit-run

# Monitor progress
tail -f /tmp/portal-audit-runs/my-audit-run/audit.log

# View agent output
cat /tmp/portal-audit-runs/my-audit-run/agent1-output.txt

# Attach to tmux to watch browsers
tmux attach-session -t audit-<runId>

# Switch between agent windows in tmux
# Ctrl+B, then 1-5 to select agent window
```

---

## 🎓 Interpreting Results

### CRITICAL (Fix Immediately)
- Security vulnerabilities enabling data breach
- Authentication/authorization bypass
- SQL injection or XSS
- Example: Dual-cabinet bug (2 accounts for 1 user)

### HIGH (Fix This Sprint)
- Serious design flaws
- DOS vulnerability
- Weak cryptography
- Missing essential security checks
- Example: No rate limiting on login

### MEDIUM (Backlog)
- Improvements to existing security
- Performance optimizations
- Code quality issues
- Example: Lighthouse score < 70

### LOW (Nice to Have)
- Minor best practices
- Polish/UX improvements
- Example: Missing Cache-Control headers

### PASSED (Good!)
- Tests that passed
- No vulnerabilities found
- Security best practices followed

---

## 🛠️ Troubleshooting

### Browsers Not Opening

```bash
# Check if Chrome is installed
which chromium-browser

# Check if Xvfb is running
ps aux | grep Xvfb

# Install if missing
apt-get install chromium-browser xvfb

# Check tmux
which tmux
```

### DevTools Not Showing

```bash
# Verify remote debugging port is open
netstat -tlnp | grep 920X

# Manually connect to DevTools
http://localhost:9201  # for agent 1
http://localhost:9202  # for agent 2
# etc...
```

### Results Not Updating

```bash
# Check status file
cat /tmp/portal-audit-runs/<runId>/status.json

# Check API endpoint
curl http://localhost:3000/api/admin/portal-audit-progress \
  -X POST -d '{"runId":"<runId>"}'

# Verify logs
cat /tmp/portal-audit-runs/<runId>/audit.log
```

---

## 📈 Execution Timeline

```
00:00 - Click "START FULL AUDIT"
00:10 - 5 Chrome windows open with DevTools
00:20 - Agent 1 (Code Security) starts analyzing
01:00 - Agent 1 completes, findings appear
02:00 - Agent 2 (OAuth) completes
03:00 - Agent 3 (Performance) completes
04:00 - Agent 4 (Input Validation) completes
05:00 - Agent 5 (Database) completes
05:30 - All agents complete, full report ready
```

---

## 📎 File Structure

```
src/
├── pages/
│   ├── admin/
│   │   └── portal-audit-visual.astro     ← NEW: Visual dashboard
│   └── api/admin/
│       └── portal-audit-progress.ts      ← NEW: Progress API
│
scripts/
└── run-visible-audit.sh                  ← NEW: Visible browser runner

/tmp/portal-audit-runs/
└── <runId>/
    ├── status.json                       (real-time status)
    ├── audit.log                         (execution log)
    ├── agent1-output.txt                 (Code Security findings)
    ├── agent2-output.txt                 (OAuth testing results)
    ├── agent3-output.txt                 (Performance metrics)
    ├── agent4-output.txt                 (Input validation results)
    └── agent5-output.txt                 (Database security findings)
```

---

## 🎯 Next Steps

1. ✅ Visit `/admin/portal-audit-visual` in browser
2. ✅ Click "START FULL AUDIT"
3. ✅ Watch 5 agent windows open
4. ✅ Monitor real-time status
5. ✅ Review findings when complete
6. ✅ Download JSON report

---

**Status:** Ready for testing
**Dashboard URL:** `https://dev.aidacamp.ru/admin/portal-audit-visual`
**Local dev:** `http://localhost:3000/admin/portal-audit-visual`
