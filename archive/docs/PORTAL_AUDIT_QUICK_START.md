# 🚀 Portal Audit Dashboard — Quick Start

## 30-Second Setup

### Local Development

```bash
# 1. Files are already in place:
# ✅ src/pages/admin/portal-audit.astro
# ✅ src/pages/api/admin/portal-audit.ts
# ✅ scripts/run-parallel-audit.sh

# 2. Start dev server
npm run dev

# 3. Open in browser
open http://localhost:3000/admin/portal-audit

# 4. Click "Start Parallel Audit (5 Agents)"
```

### Production Deployment

```bash
# 1. Deploy to server
bash scripts/deploy-audit-dashboard.sh

# 2. Access dashboard
# https://dev.aidacamp.ru/admin/portal-audit
```

---

## 🎯 One-Click Interface

**What you'll see:**

```
┌─────────────────────────────────────────┐
│  🔍 Portal Security Audit               │
│  Run comprehensive security checks      │
├─────────────────────────────────────────┤
│  [🟢 Start Parallel Audit (5 Agents)]   │
└─────────────────────────────────────────┘
```

**Click button → 5 agents run in parallel → Results in ~10 min**

---

## 📊 Dashboard Features

| Feature | Description |
|---------|-------------|
| 🟢 **One-Click Start** | Launch all 5 agents with single button |
| 📈 **Live Progress** | Real-time status of each agent |
| 🎯 **Severity Filter** | CRITICAL, HIGH, MEDIUM findings |
| 💾 **JSON Export** | Download full report |
| 📜 **History** | Previous audit runs |
| 🔄 **Retry** | Run new audit after viewing results |

---

## 🤖 5 Agents Running Parallel

```
┌─────────────────────────────────────────────────┐
│ ⏳ Running Audit                                │
├─────────────────────────────────────────────────┤
│ ✅ Code Security Audit               completed  │
│ ⏳ OAuth Provider Testing             running    │
│ ⏸️  Performance & DOS                pending    │
│ ⏸️  Input Validation & XSS/SQLi       pending    │
│ ⏸️  Database Security                 pending    │
└─────────────────────────────────────────────────┘
```

---

## 📋 What Each Agent Checks

### 1️⃣ Code Security Audit
- Dual-cabinet bug (OAuth + email fallback creating 2 accounts)
- Race conditions in signup
- SQL injection & XSS vulnerabilities
- CSRF protection
- JWT token handling

### 2️⃣ OAuth Provider Testing
- Telegram/Google/GitHub OAuth flows
- Email claim verification
- Account merge configuration
- Dual-account risk assessment

### 3️⃣ Performance & DOS Audit
- Rate limiting effectiveness
- Brute-force protection
- Query performance
- Lighthouse scoring
- CAPTCHA presence

### 4️⃣ Input Validation & Security
- Email validation edge cases
- Password handling
- XSS/SQLi payload testing
- CSRF token verification
- Unicode/null-byte handling

### 5️⃣ Database Security
- Email uniqueness constraints
- OAuth sub uniqueness
- Orphaned data detection
- Transaction isolation
- Audit logging

---

## 📊 Example Results

After audit completes, you'll see:

```
CRITICAL BUGS
├── Dual-cabinet vulnerability (OAuth)
├── Race condition in signup endpoint
└── Missing CSRF tokens in auth forms

HIGH SEVERITY
├── Weak rate limiting on /signin
├── No brute-force protection
└── Input validation gaps

MEDIUM SEVERITY
├── Missing audit logging
├── Incomplete error handling
└── Performance optimization needed
```

**Download JSON report with full details and fix recommendations.**

---

## ⚡ Performance

- **Agent 1** (Code): 5-7 min
- **Agent 2** (OAuth): 3-5 min
- **Agent 3** (Perf): 4-6 min
- **Agent 4** (Input): 5-8 min
- **Agent 5** (DB): 3-4 min

**Parallel execution: ~10 minutes total** (not 25+)

---

## 🔗 Access Control

The dashboard is restricted to admin IPs:
- Locally: `http://localhost:3000/admin/portal-audit`
- Production: Requires IP whitelist (37.113.209.255)

---

## 📱 API Usage

If you want to automate audit runs:

```bash
# Start audit
curl -X POST /api/admin/portal-audit \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'

# Get status
curl -X POST /api/admin/portal-audit \
  -d '{"action": "status", "runId": "audit-1717251234"}'

# Fetch results
curl -X POST /api/admin/portal-audit \
  -d '{"action": "results", "runId": "audit-1717251234"}'
```

---

## 🛠️ Troubleshooting

**"Agents not starting"**
```bash
# Verify Claude CLI is installed
which claude
# Should output: /usr/local/bin/claude or similar
```

**"API endpoint not found"**
```bash
# Rebuild project
npm run build

# Verify dist/server contains API
ls dist/server/pages/api/admin/
```

**"Results not ready"**
- Agents take time to run (5-10 min each)
- Refresh dashboard every 2 minutes
- Check audit logs in `/tmp/portal-audit-runs/audit-<timestamp>/audit.log`

---

## 📁 Files Created

```
src/pages/
  └── admin/
      └── portal-audit.astro           (UI Dashboard)
src/pages/api/admin/
  └── portal-audit.ts                  (API Endpoint)
scripts/
  ├── run-parallel-audit.sh            (Executor)
  └── deploy-audit-dashboard.sh        (Deployment)

Documentation:
  ├── PORTAL_AUDIT_SETUP.md            (Full setup guide)
  └── PORTAL_AUDIT_QUICK_START.md      (This file)
```

---

**Dashboard URL:** `https://dev.aidacamp.ru/admin/portal-audit`

**Status:** ✅ Ready to deploy
