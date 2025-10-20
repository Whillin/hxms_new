import http from 'node:http'

const base = 'http://localhost:3001'

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {})
    const req = http.request(
      `${base}${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      (res) => {
        let resp = ''
        res.on('data', (chunk) => (resp += chunk))
        res.on('end', () => resolve({ status: res.statusCode, body: resp }))
      }
    )
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

;(async () => {
  try {
    const payload = {
      username: `z-test-${Date.now()}`,
      password: '123456',
      name: '陈超超',
      phone: '15260376761'
    }
    const resp = await post('/api/auth/register', payload)
    console.log('status:', resp.status)
    try {
      const json = JSON.parse(resp.body)
      console.log('json:', JSON.stringify(json, null, 2))
    } catch (e) {
      console.error('JSON parse failed:', e)
      console.log('body:', resp.body)
    }
  } catch (err) {
    console.error('error:', err)
    process.exitCode = 1
  }
})()
