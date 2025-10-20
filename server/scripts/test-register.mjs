// Test register flow: require name+phone match, employee must be active, and prevent duplicate registration by employeeId

const base = 'http://localhost:3003'

async function registerOnce(payload) {
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
    console.error('registerOnce: JSON parse failed', err)
  }
  return { status: resp.status, data, raw: text }
}

async function main() {
  const payload = {
    userName: `tech_${Date.now()}`,
    name: '员工2',
    phone: '13800001002',
    password: '123456'
  }
  console.log('Registering first time with payload:', payload)
  const r1 = await registerOnce(payload)
  console.log('First register status:', r1.status)
  console.log('First register data:', r1.data || r1.raw)

  console.log('Registering second time (duplicate employee) with same name/phone but new username')
  const payload2 = { ...payload, userName: payload.userName + '_dup' }
  const r2 = await registerOnce(payload2)
  console.log('Second register status:', r2.status)
  console.log('Second register data:', r2.data || r2.raw)
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
