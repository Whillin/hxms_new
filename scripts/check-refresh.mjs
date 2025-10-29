// Public login + refresh test for hxms_new
// Usage: node scripts/check-refresh.mjs [--base http://host/api] [--user Admin] [--pass 123456] [--form] [--verbose]

const args = process.argv.slice(2)
function parseArgs() {
  const out = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith('--')) {
      const [k, v] = a.split('=')
      const key = k.replace(/^--/, '')
      if (v !== undefined) out[key] = v
      else if (args[i + 1] && !args[i + 1].startsWith('--')) out[key] = args[++i]
      else out[key] = true
    }
  }
  return out
}
const OPTS = parseArgs()
const BASE = OPTS.base || process.env.HXMS_BASE || 'http://106.52.174.194/api'
const USER = OPTS.user || process.env.HXMS_USER || 'Admin'
const PASS = OPTS.pass || process.env.HXMS_PASS || '123456'
const USE_FORM = !!OPTS.form
const VERBOSE = !!OPTS.verbose

async function login(userName, password) {
  const headers = USE_FORM
    ? { 'Content-Type': 'application/x-www-form-urlencoded' }
    : { 'Content-Type': 'application/json' }
  const body = USE_FORM
    ? `userName=${encodeURIComponent(userName)}&password=${encodeURIComponent(password)}`
    : JSON.stringify({ userName, password })
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers,
    body
  })
  const json = await res.json()
  return json
}

async function refresh(refreshToken) {
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })
  const json = await res.json()
  return json
}

;(async () => {
  try {
    console.log(`[TEST] Base: ${BASE} Mode: ${USE_FORM ? 'form' : 'json'}`)
    console.log('[TEST] Login...')
    const loginRes = await login(USER, PASS)
    if (VERBOSE) console.log('[Login Raw]', loginRes)
    console.log('[Login]', loginRes.code, loginRes.msg)
    if (!loginRes?.data?.refreshToken) {
      console.error('No refreshToken in login response:', loginRes)
      process.exit(2)
    }
    const rt = loginRes.data.refreshToken
    console.log('[TEST] Refresh...')
    const refreshRes = await refresh(rt)
    if (VERBOSE) console.log('[Refresh Raw]', refreshRes)
    console.log('[Refresh]', refreshRes.code, refreshRes.msg)
    if (refreshRes?.data?.token) {
      console.log('[OK] Refresh returned new token')
    } else {
      console.log('[WARN] No token returned:', refreshRes)
    }
  } catch (e) {
    console.error('Test failed:', e)
    process.exit(1)
  }
})()
