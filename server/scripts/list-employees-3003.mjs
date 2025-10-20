import http from 'node:http'

const base = 'http://localhost:3003'

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${base}${path}`, { method: 'GET' }, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.end()
  })
}

;(async () => {
  try {
    const resp = await get('/api/employee/list?current=1&size=100')
    console.log('status:', resp.status)
    try {
      const json = JSON.parse(resp.body)
      console.log('raw json:', JSON.stringify(json, null, 2))
      const rows = json?.data?.records || json?.data?.list || json?.data?.data || []
      console.log('parsed rows (name, phone, status, role):')
      for (const r of rows) {
        console.log(`- ${r.name} | ${r.phone} | status=${r.status} | role=${r.role}`)
      }
    } catch (e) {
      console.error('JSON parse failed:', e)
      console.log('body:', resp.body)
    }
  } catch (err) {
    console.error(err)
    process.exitCode = 1
  }
})()
