import http from 'http'

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJOYW1lIjoiQWRtaW4iLCJyb2xlcyI6WyJSX0FETUlOIl0sImlhdCI6MTc2ODQ2MjI2MiwiZXhwIjoxNzY4NDY5NDYyfQ.WAfBiiAgLMsf5V_H4-e6vjlkFwk1Os5ZHdC6705vRXA'

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3001,
        path,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      (res) => {
        let buf = ''
        res.on('data', (c) => (buf += c))
        res.on('end', () => {
          try {
            resolve(JSON.parse(buf))
          } catch {
            resolve(buf)
          }
        })
      }
    )
    req.on('error', (e) => reject(e))
    req.write(data)
    req.end()
  })
}

async function main() {
  const res = await post('/api/opportunity/save', {
    id: 119,
    latestStatus: '已战败',
    defeatReasons: ['预算不足', '同城同品']
  })
  console.log(res)
}

main().catch((e) => {
  console.error('Failed:', e.message)
})
