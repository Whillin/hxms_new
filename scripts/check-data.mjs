// Check department and clue list via public API
// Usage: node scripts/check-data.mjs [--base http://host/api] [--user Admin] [--pass 123456] [--form] [--verbose]

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
  const res = await fetch(`${BASE}/auth/login`, { method: 'POST', headers, body })
  const json = await res.json()
  return json
}

async function listDepartments(token) {
  const res = await fetch(`${BASE}/department/list`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  })
  const json = await res.json()
  return json
}

async function listClues(token) {
  const url = new URL(`${BASE}/clue/list`)
  url.searchParams.set('current', '1')
  url.searchParams.set('size', '10')
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
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
    const token = loginRes?.data?.token
    if (!token) {
      console.error('Login did not return token')
      process.exit(2)
    }

    console.log('[TEST] Departments...')
    const deptRes = await listDepartments(token)
    if (VERBOSE) console.log('[Dept Raw]', deptRes)
    console.log('[Dept]', deptRes.code, deptRes.msg)
    const deptData = Array.isArray(deptRes?.data) ? deptRes.data : []
    console.log(`[Dept] count=${deptData.length}`)
    if (deptData.length) {
      console.log('[Dept] sample:', JSON.stringify(deptData[0], null, 2))
    }

    console.log('[TEST] Clues...')
    const clueRes = await listClues(token)
    if (VERBOSE) console.log('[Clue Raw]', clueRes)
    console.log('[Clue]', clueRes.code, clueRes.msg)
    const clueData = clueRes?.data?.records || []
    console.log(`[Clue] total=${clueRes?.data?.total || 0} page_count=${clueData.length}`)
    if (clueData.length) {
      console.log('[Clue] sample:', JSON.stringify(clueData[0], null, 2))
    }

    console.log('[OK] Done')
  } catch (e) {
    console.error('Check failed:', e)
    process.exit(1)
  }
})()
