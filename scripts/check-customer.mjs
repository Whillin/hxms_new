// Check customer list and save via public API
// Usage: node scripts/check-customer.mjs [--base http://host/api] [--user Admin] [--pass 123456] [--verbose]

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
const VERBOSE = !!OPTS.verbose

async function login(userName, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName, password })
  })
  const json = await res.json()
  return json
}

async function listCustomers(token) {
  const url = new URL(`${BASE}/customer/list`)
  url.searchParams.set('current', '1')
  url.searchParams.set('size', '10')
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  })
  const json = await res.json()
  return json
}

async function saveCustomer(token, payload) {
  const res = await fetch(`${BASE}/customer/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  })
  const json = await res.json()
  return json
}

;(async () => {
  try {
    console.log(`[TEST] Base: ${BASE}`)
    console.log('[TEST] Login...')
    const loginRes = await login(USER, PASS)
    if (VERBOSE) console.log('[Login Raw]', loginRes)
    console.log('[Login]', loginRes.code, loginRes.msg)
    const token = loginRes?.data?.token
    if (!token) {
      console.error('Login did not return token')
      process.exit(2)
    }

    console.log('[TEST] Customers...')
    const listRes = await listCustomers(token)
    if (VERBOSE) console.log('[List Raw]', listRes)
    console.log('[List]', listRes.code, listRes.msg)
    const page = listRes?.data
    const first = Array.isArray(page?.records) && page.records.length ? page.records[0] : null
    console.log(`[List] total=${page?.total || 0} page_count=${page?.records?.length || 0}`)
    if (!first) {
      console.log('[WARN] No customer to test save')
      process.exit(0)
    }
    console.log('[Sample]', JSON.stringify(first, null, 2))

    console.log('[TEST] Save echo (no changes)...')
    const payload = {
      id: Number(first.id),
      userName: String(first.userName || ''),
      userPhone: String(first.userPhone || ''),
      userGender: String(first.userGender || '未知'),
      userAge: Number(first.userAge || 0),
      buyExperience: String(first.buyExperience || '首购'),
      userPhoneModel: first.userPhoneModel || '',
      currentBrand: first.currentBrand || '',
      currentModel: first.currentModel || '',
      carAge: Number(first.carAge || 0),
      mileage: Number(first.mileage || 0),
      livingArea: Array.isArray(first.livingArea)
        ? first.livingArea.join('/')
        : String(first.livingArea || '')
    }
    const saveRes = await saveCustomer(token, payload)
    if (VERBOSE) console.log('[Save Raw]', saveRes)
    console.log('[Save]', saveRes.code, saveRes.msg)
    if (saveRes.code !== 200) {
      console.error('[ERR] Save failed:', JSON.stringify(saveRes, null, 2))
      process.exit(3)
    }
    console.log('[OK] Save echo succeeded')
  } catch (e) {
    console.error('Check failed:', e)
    process.exit(1)
  }
})()