import http from 'node:http'

const host = 'localhost'
const port = 3010 // vite dev server port
const path = '/api/auth/login'

const payload = JSON.stringify({ userName: 'Admin', password: '123456' })

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
