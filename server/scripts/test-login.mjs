import http from 'node:http'

const payload = JSON.stringify({ userName: 'admin', password: 'admin123' })

const req = http.request(
  'http://localhost:3001/api/auth/login',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  },
  res => {
    let data = ''
    res.on('data', chunk => (data += chunk))
    res.on('end', () => {
      console.log('status:', res.statusCode)
      console.log(data)
      process.exit(0)
    })
  }
)

req.on('error', err => {
  console.error('request error:', err)
  process.exit(1)
})

req.write(payload)
req.end()