# 🔍 Portal Audit Dashboard — Setup & Usage

## 📋 Overview

Complete web-based security audit dashboard for `ai.aidacamp.ru` portal. One-click launcher for 5 parallel headless agents running comprehensive security checks.

**Architecture:**
- Frontend: Astro component at `/admin/portal-audit`
- Backend: API endpoint at `/api/admin/portal-audit.ts`
- Executor: Bash script `/scripts/run-parallel-audit.sh`

---

## 🚀 Deployment

### 1. Local Development

```bash
# Files already created:
# - src/pages/admin/portal-audit.astro (UI dashboard)
# - src/pages/api/admin/portal-audit.ts (API endpoint)
# - scripts/run-parallel-audit.sh (executor)

# Start dev server
npm run dev

# Visit dashboard
open http://localhost:3000/admin/portal-audit
```

### 2. Production Deployment

```bash
# Build
npm run build

# Ensure script is on server
scp -i ~/.ssh/aidacamp_prod scripts/run-parallel-audit.sh \
  root@159.194.223.55:/opt/scripts/

# SSH into server
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55

# Make executable
chmod +x /opt/scripts/run-parallel-audit.sh

# Ensure audit directory exists
mkdir -p /tmp/portal-audit-runs
chmod 777 /tmp/portal-audit-runs
```

### 3. Nginx Configuration

Add to `/etc/nginx/sites-available/aidacamp.ru`:

```nginx
# Portal Audit endpoint (admin only)
location /admin/portal-audit {
    # Restrict to admin IPs
    allow 37.113.209.255;    # Your IP
    deny all;

    try_files $uri $uri/ @astro;
}

location /api/admin/portal-audit {
    allow 37.113.209.255;
    deny all;

    try_files $uri @astro;
}
```

---

## 🎯 Usage

### Web Interface

1. Navigate to: `https://dev.aidacamp.ru/admin/portal-audit`
2. Click **"Start Parallel Audit (5 Agents)"** button
3. Watch real-time progress of 5 agents
4. View findings organized by severity (CRITICAL/HIGH/MEDIUM)
5. Download JSON report

### API Direct Call

```bash
# Start audit
curl -X POST https://dev.aidacamp.ru/api/admin/portal-audit \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'

# Response
{"success": true, "data": {"runId": "audit-1717251234"}}

# Check status
curl -X POST https://dev.aidacamp.ru/api/admin/portal-audit \
  -H "Content-Type: application/json" \
  -d '{"action": "status", "runId": "audit-1717251234"}'

# Get results (when completed)
curl -X POST https://dev.aidacamp.ru/api/admin/portal-audit \
  -H "Content-Type: application/json" \
  -d '{"action": "results", "runId": "audit-1717251234"}'

# List all audits
curl -X POST https://dev.aidacamp.ru/api/admin/portal-audit \
  -H "Content-Type: application/json" \
  -d '{"action": "list"}'
```

---

## 🤖 Five Parallel Agents

### Agent 1: Code Security Audit
- DUAL-CABINET bug analysis (OAuth + email fallback)
- Race condition detection in signup
- Input validation (SQL injection, XSS)
- CSRF protection verification
- JWT token lifecycle review

**Files analyzed:**
- `backend/open_webui/routers/auths.py`
- `backend/open_webui/utils/oauth.py`
- `backend/open_webui/config.py`

### Agent 2: OAuth Provider Testing
- Telegram OAuth flow testing (email claim)
- Google/GitHub provider validation
- ENABLE_OAUTH_EMAIL_FALLBACK check
- OAUTH_MERGE_ACCOUNTS_BY_EMAIL verification
- Dual-account risk assessment

**Tools used:**
- SSH to production server
- Docker container inspection
- Network request analysis

### Agent 3: Performance & DOS Audit
- Rate limiting on `/signin`
- Brute-force protection check
- Query performance analysis
- Lighthouse scoring
- CAPTCHA presence verification

**Checks:**
- Network waterfall analysis
- Server log inspection
- Performance metrics

### Agent 4: Input Validation & Security
- Email validation edge cases
- Password handling
- OAuth name field (XSS, Unicode)
- CSRF token verification
- Practical payload testing

**Test cases:**
- Long emails, special characters
- SQL injection patterns
- XSS payloads
- Null bytes, Unicode

### Agent 5: Database Security
- Email uniqueness constraints
- OAuth sub uniqueness
- Orphaned data detection
- Transaction isolation
- Audit logging verification

**SQL inspection:**
- Duplicate email detection
- OAuth configuration
- Database constraints

---

## 📊 Results Output

Findings are organized as:

```json
{
  "audit_timestamp": "2026-06-01T12:34:56Z",
  "portal": "https://ai.aidacamp.ru",
  "summary": "Parallel security audit — 5 agents",
  "agents_count": 5,
  "bugs": [
    {
      "severity": "CRITICAL",
      "title": "Dual-cabinet vulnerability",
      "location": "oauth.py:1630",
      "description": "One user can have 2 separate accounts...",
      "fix": "Set OAUTH_MERGE_ACCOUNTS_BY_EMAIL=True or disable ENABLE_OAUTH_EMAIL_FALLBACK"
    }
  ]
}
```

---

## 🔧 Troubleshooting

### Agents Not Starting

```bash
# Check if claude CLI is installed
which claude

# Verify SSH key for server access
ssh -i ~/.ssh/aidacamp_prod root@159.159.223.55 "echo OK"

# Check audit directory permissions
ls -la /tmp/portal-audit-runs/
```

### Results Not Ready

- Agents take 5-10 minutes per agent (run in parallel)
- Check status via API: `/api/admin/portal-audit` with `action: status`
- View logs: `/tmp/portal-audit-runs/audit-<timestamp>/audit.log`

### API Not Responding

```bash
# Check if /api/admin endpoint is compiled
npm run build
ls -la dist/server/pages/api/admin/

# Test endpoint directly
curl -v http://localhost:3000/api/admin/portal-audit
```

---

## 📁 File Structure

```
src/
├── pages/
│   ├── admin/
│   │   └── portal-audit.astro          (Dashboard UI)
│   └── api/
│       └── admin/
│           └── portal-audit.ts          (API endpoint)
└── 

scripts/
└── run-parallel-audit.sh                (Executor)

/tmp/
└── portal-audit-runs/                   (Results storage)
    └── audit-<timestamp>/
        ├── status.json                  (Live status)
        ├── FINDINGS.json                (Final results)
        ├── agent1-output.json           (Code audit)
        ├── agent2-output.json           (OAuth testing)
        ├── agent3-output.json           (Perf audit)
        ├── agent4-output.json           (Input validation)
        ├── agent5-output.json           (DB security)
        └── audit.log                    (Execution log)
```

---

## 🔐 Security Notes

- Dashboard is admin-restricted (IP whitelist in nginx)
- Results are stored locally, not sent to external services
- Agents run as headless processes with restricted tools
- SSH operations require valid credentials
- Results contain sensitive findings — restrict access

---

## 📈 Execution Time

- **Per agent**: 5-10 minutes each
- **Total (parallel)**: ~10 minutes (not 50)
- **Network overhead**: ~30 seconds

---

## 🎓 Example Workflow

```bash
# 1. Click "Start Parallel Audit" button
# ⏳ 10 seconds: Agents initialize

# 2. Real-time progress display
# 📊 Agent 1: Code Security Audit... running
# 📊 Agent 2: OAuth Provider Testing... running
# 📊 Agent 3: Performance & DOS Audit... running
# 📊 Agent 4: Input Validation & Security... running
# 📊 Agent 5: Database Security... running

# 3. After ~10 minutes
# ✅ All agents complete

# 4. View results
# 🔴 3 CRITICAL findings
# 🟡 7 HIGH findings
# 🔵 12 MEDIUM findings

# 5. Download JSON report or review in browser
```

---

**Created:** 2026-06-01  
**Dashboard URL:** `https://dev.aidacamp.ru/admin/portal-audit`  
**API Endpoint:** `/api/admin/portal-audit`
