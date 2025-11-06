const BASE = process.env.HXMS_BASE || 'http://106.52.174.194/api'

const payload = {
  username: '李德欢',
  password: '123456',
  name: '李德欢',
  phone: '18931681314'
}

async function main() {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  let text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  console.log('status:', res.status)
  console.log('response:', JSON.stringify(json, null, 2))
}

main().catch((err) => {
  console.error('error:', err)
  process.exit(1)
})
