// Test four registration scenarios against http://localhost:3003
// 1) Active employee not registered yet, but wrong phone => should fail
// 2) Inactive employee with correct name+phone => should fail
// 3) Non-existent employee => should fail
// 4) Active employee with correct name+phone but already has account => should fail

const base = 'http://localhost:3003'

async function httpGet(path) {
  const resp = await fetch(`${base}${path}`)
  const text = await resp.text()
  let data
  try {
    data = JSON.parse(text)
  } catch (err) {
    console.error('httpGet: JSON parse failed', err)
  }
  return { status: resp.status, data, raw: text }
}

async function register(payload) {
  const resp = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const text = await resp.text()
  let data
  try {
    data = JSON.parse(text)
  } catch (err) {
    console.error('register: JSON parse failed', err)
  }
  return { status: resp.status, data, raw: text }
}

function pickEmployees(list) {
  const toStr = (v) => (v === undefined || v === null ? '' : String(v))
  const isActive = (s) => toStr(s) === '1'

  const active = list.find((r) => isActive(r.status))
  const inactive = list.find((r) => !isActive(r.status))
  const emp2 = list.find((r) => toStr(r.name) === '员工2')
  return { active, inactive, emp2 }
}

async function main() {
  const empResp = await httpGet('/api/employee/list?current=1&size=100')
  const rows =
    empResp?.data?.data?.records ||
    empResp?.data?.data?.list ||
    empResp?.data?.data ||
    empResp?.data?.records ||
    empResp?.data?.list ||
    []
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('Failed to load employees list. Raw:', empResp.raw)
    process.exit(1)
  }
  const { active, inactive, emp2 } = pickEmployees(rows)
  console.log('Picked employees:')
  console.log('  active:', active)
  console.log('  inactive:', inactive)
  console.log('  emp2:', emp2)

  // Case 1: Active employee, wrong phone
  const wrongPhone = (active?.phone || '13800001001').replace(/\d$/, (d) =>
    String((Number(d) + 1) % 10)
  )
  const case1Payload = {
    userName: `case1_${Date.now()}`,
    name: active.name,
    phone: wrongPhone,
    password: '123456'
  }
  const r1 = await register(case1Payload)
  console.log('\n[Case1] Active employee, wrong phone:')
  console.log('status:', r1.status)
  console.log('data:', r1.data || r1.raw)

  // Case 2: Inactive employee, correct name+phone
  const case2Payload = {
    userName: `case2_${Date.now()}`,
    name: inactive.name,
    phone: String(inactive.phone),
    password: '123456'
  }
  const r2 = await register(case2Payload)
  console.log('\n[Case2] Inactive employee, correct name+phone:')
  console.log('status:', r2.status)
  console.log('data:', r2.data || r2.raw)

  // Case 3: Non-existent employee
  const case3Payload = {
    userName: `case3_${Date.now()}`,
    name: '不存在员工X',
    phone: '13900009999',
    password: '123456'
  }
  const r3 = await register(case3Payload)
  console.log('\n[Case3] Non-existent employee:')
  console.log('status:', r3.status)
  console.log('data:', r3.data || r3.raw)

  // Case 4: Active employee already has account (use 员工2 if exists)
  const name4 = emp2?.name || active.name
  const phone4 = emp2?.phone ? String(emp2.phone) : String(active.phone)
  const case4Payload = {
    userName: `case4_${Date.now()}`,
    name: name4,
    phone: phone4,
    password: '123456'
  }
  const r4 = await register(case4Payload)
  console.log('\n[Case4] Active employee already has account:')
  console.log('status:', r4.status)
  console.log('data:', r4.data || r4.raw)
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
