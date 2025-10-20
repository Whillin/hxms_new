import http from 'node:http'

const payload = JSON.stringify({
  username: 'user13800001002',
  password: '123456',
  name: '员工2',
  phone: '13800001002'
})

const req = http.request(
  'http://localhost:3001/api/auth/register',
  {
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
      process.exit(0)
    })
  }
)

req.on('error', (err) => {
  console.error('request error:', err)
  process.exit(1)
})

req.write(payload)
req.end()
