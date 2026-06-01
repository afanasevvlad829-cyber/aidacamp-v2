import type { APIRoute } from 'astro'
import { execSync, spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const AUDIT_DIR = '/tmp/portal-audit-runs'
const RESULTS_FILE = 'FINDINGS.json'

// Ensure audit directory exists
if (!fs.existsSync(AUDIT_DIR)) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true })
}

interface AuditRequest {
  action: 'start' | 'status' | 'results' | 'list'
  runId?: string
}

interface AuditResponse {
  success: boolean
  data?: Record<string, unknown>
  error?: string
  message?: string
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as AuditRequest
    const { action, runId } = body

    switch (action) {
      case 'start':
        return startAudit()
      case 'status':
        return getAuditStatus(runId)
      case 'results':
        return getAuditResults(runId)
      case 'list':
        return listAudits()
      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unknown action',
          } as AuditResponse),
          { status: 400 }
        )
    }
  } catch (err) {
    console.error('Portal audit API error:', err)
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      } as AuditResponse),
      { status: 500 }
    )
  }
}

function startAudit() {
  const runId = `audit-${Date.now()}`
  const runDir = path.join(AUDIT_DIR, runId)

  fs.mkdirSync(runDir, { recursive: true })

  const statusFile = path.join(runDir, 'status.json')
  fs.writeFileSync(
    statusFile,
    JSON.stringify({
      runId,
      status: 'starting',
      startTime: new Date().toISOString(),
      agents: [
        { name: 'Code Audit', status: 'pending' },
        { name: 'OAuth Flow Testing', status: 'pending' },
        { name: 'Performance & DOS', status: 'pending' },
        { name: 'Input Validation & XSS/SQLi', status: 'pending' },
        { name: 'Database Security', status: 'pending' },
      ],
    })
  )

  // Start audit in background
  const subprocess = spawn('bash', ['/opt/scripts/run-parallel-audit.sh', runDir], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  subprocess.unref()

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Audit started',
      data: { runId },
    } as AuditResponse),
    { status: 200 }
  )
}

function getAuditStatus(runId?: string) {
  if (!runId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'runId is required',
      } as AuditResponse),
      { status: 400 }
    )
  }

  const statusFile = path.join(AUDIT_DIR, runId, 'status.json')

  if (!fs.existsSync(statusFile)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Audit not found',
      } as AuditResponse),
      { status: 404 }
    )
  }

  const status = JSON.parse(fs.readFileSync(statusFile, 'utf-8'))

  return new Response(
    JSON.stringify({
      success: true,
      data: status,
    } as AuditResponse),
    { status: 200 }
  )
}

function getAuditResults(runId?: string) {
  if (!runId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'runId is required',
      } as AuditResponse),
      { status: 400 }
    )
  }

  const resultsFile = path.join(AUDIT_DIR, runId, RESULTS_FILE)

  if (!fs.existsSync(resultsFile)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Results not ready',
      } as AuditResponse),
      { status: 404 }
    )
  }

  const results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'))

  return new Response(
    JSON.stringify({
      success: true,
      data: results,
    } as AuditResponse),
    { status: 200 }
  )
}

function listAudits() {
  const runs = fs
    .readdirSync(AUDIT_DIR)
    .filter((name) => name.startsWith('audit-'))
    .map((runId) => {
      const statusFile = path.join(AUDIT_DIR, runId, 'status.json')
      if (fs.existsSync(statusFile)) {
        return JSON.parse(fs.readFileSync(statusFile, 'utf-8'))
      }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

  return new Response(
    JSON.stringify({
      success: true,
      data: runs,
    } as AuditResponse),
    { status: 200 }
  )
}
