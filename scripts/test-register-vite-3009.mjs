import http from 'node:http'

const host = 'localhost'
const port = 3009
const path = '/api/auth/register'

const payload = JSON.stringify({
  username: `ui-test-${Date.now()}`,
  password: '123456',
  name: '陈超超',
  phone: '15260376761'
})

const req = http.request(
  {
    host,
    port,
    path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  },
  (res) => {
    let data = ''
    res.on('data', (chunk) => (data += chunk))
    res.on('end', () => {
      console.log('status:', res.statusCode)
      try {
        const json = JSON.parse(data)
        console.log('body:', JSON.stringify(json, null, 2))
      } catch {
        console.log('body:', data)
      }
    })
  }
)

req.on('error', (err) => {
  console.error('error:', err.message)
})

req.write(payload)
req.end()
