// Usage:
//   node scripts/test-save-opportunity.mjs --base http://localhost:3002/api --user 陈纪杭 --pass 123456 [--verbose]
//
// This script logs in, saves a new opportunity with minimal required fields,
// and then queries the list to confirm it is visible to the same sales user.

function parseArgs() {
  const args = { base: 'http://localhost:3002/api', user: '陈纪杭', pass: '123456', verbose: false }
  for (let i = 2; i < process.argv.length; i++) {
    const k = process.argv[i]
    if (k === '--base') args.base = process.argv[++i]
    else if (k === '--user') args.user = process.argv[++i]
    else if (k === '--pass') args.pass = process.argv[++i]
    else if (k === '--verbose') args.verbose = true
  }
  return args
}

async function fetchJson(url, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const body = opts.body !== undefined ? JSON.stringify(opts.body) : opts.body
  const res = await fetch(url, { ...opts, headers, body })
  let json
  try {
    json = await res.json()
  } catch {
    json = { code: res.status, msg: 'non-json', data: null }
  }
  return { status: res.status, json }
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` }
}

function today() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function randomPhone() {
  // Mainland 11-digit: start with 13x/15x/18x etc.; use 139 + 8 digits
  const suffix = String(Math.floor(Math.random() * 1e8)).padStart(8, '0')
  return `139${suffix}`
}

async function main() {
  const { base, user, pass, verbose } = parseArgs()
  const log = (...args) => {
    if (verbose) console.log(...args)
  }

  console.log(`[test-save-opportunity] base=${base} user=${user}`)

  // 1) login
  const loginRes = await fetchJson(`${base}/auth/login`, {
    method: 'POST',
    body: { userName: user, password: pass }
  })
  if (loginRes.json?.code !== 200 || !loginRes.json?.data?.token) {
    console.error('login failed:', loginRes.json)
    process.exit(1)
  }
  const token = loginRes.json.data.token
  log('login ok, token acquired')

  // 2) user info
  const infoRes = await fetchJson(`${base}/user/info`, { headers: bearer(token) })
  if (infoRes.json?.code !== 200 || !infoRes.json?.data) {
    console.error('user/info failed:', infoRes.json)
    process.exit(1)
  }
  const info = infoRes.json.data
  const employeeId = Number(info.employeeId)
  const storeId = Number(info.storeId)
  const roles = Array.isArray(info.roles) ? info.roles : []
  console.log('user info:', { employeeId, storeId, roles })

  if (!storeId || Number.isNaN(storeId)) {
    console.error('no storeId in user info; cannot save opportunity')
    process.exit(1)
  }

  // 3) derive consultant name; try employee list first, fallback to pattern `员工${employeeId}`
  let consultantName = ''
  if (employeeId && !Number.isNaN(employeeId)) {
    const empListUrl = new URL(`${base}/employee/list`)
    empListUrl.searchParams.set('current', '1')
    empListUrl.searchParams.set('size', '200')
    empListUrl.searchParams.set('storeId', String(storeId))
    empListUrl.searchParams.set('status', '1')
    const empListRes = await fetchJson(empListUrl.toString(), { headers: bearer(token) })
    const list = empListRes?.json?.data?.records || []
    const selfEmp = list.find((e) => Number(e.id) === employeeId)
    if (selfEmp?.name) consultantName = String(selfEmp.name)
  }
  if (!consultantName && employeeId) consultantName = `员工${employeeId}`
  log('consultantName resolved:', consultantName)

  // 4) save a new opportunity
  const payload = {
    storeId,
    visitDate: today(),
    salesConsultant: consultantName,
    customerName: '自动化测试',
    customerPhone: randomPhone(),
    opportunityLevel: 'B',
    focusModelName: '测试车型',
    testDrive: false,
    bargaining: true,
    latestStatus: '跟进中',
    channelLevel1: '线上'
  }
  log('saving payload:', payload)
  const saveRes = await fetchJson(`${base}/opportunity/save`, {
    method: 'POST',
    headers: bearer(token),
    body: payload
  })
  if (saveRes.json?.code !== 200 || saveRes.json?.data !== true) {
    console.error('save failed:', saveRes.json)
    process.exit(1)
  }
  console.log('save ok')

  // 5) list and confirm visibility (for sales should be self-owned only)
  const listRes = await fetchJson(`${base}/opportunity/list?current=1&size=10`, {
    headers: bearer(token)
  })
  if (listRes.json?.code !== 200) {
    console.error('list failed:', listRes.json)
    process.exit(1)
  }
  const records = listRes.json?.data?.records || []
  const found = records.find((r) => String(r.customerPhone) === payload.customerPhone)
  if (found) {
    console.log('list visible ok: id=', found.id, 'ownerId=', found.ownerId)
  } else {
    console.warn('list does not include saved record; owner or scope may differ.')
  }
}

main().catch((err) => {
  console.error('unexpected error:', err)
  process.exit(1)
})
