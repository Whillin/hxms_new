import http from 'node:http'

const base = 'http://localhost:3002'

function post(path, json) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(json)
    const req = http.request(
      `${base}${path}`,
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
        res.on('end', () => resolve({ status: res.statusCode, body: data }))
      }
    )
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${base}${path}`, { method: 'GET', headers }, (res) => {
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
    // 生成唯一用户名，避免重复导致注册失败
    const uniqueUserName = `user${Date.now()}`

    // 1) 注册（姓名/手机号需与已植入的员工匹配，且在职）
    const registerResp = await post('/api/auth/register', {
      username: uniqueUserName,
      password: '123456',
      name: '员工2',
      phone: '13800001002'
    })
    console.log('register.status:', registerResp.status)
    let regData
    try {
      regData = JSON.parse(registerResp.body)
    } catch (parseErr) {
      console.warn('register: JSON parse failed', parseErr)
    }
    console.log('register.body:', regData || registerResp.body)
    const token = regData?.data?.token
    if (!token) {
      console.error('No token from register, aborting.')
      process.exit(1)
    }

    // 2) 用 token 获取用户信息
    const infoResp = await get('/api/user/info', { Authorization: `Bearer ${token}` })
    console.log('info.status:', infoResp.status)
    let infoData
    try {
      infoData = JSON.parse(infoResp.body)
    } catch (parseErr) {
      console.warn('info: JSON parse failed', parseErr)
    }
    console.log('info.body:', infoData || infoResp.body)

    // 3) 简要断言：roles 应包含至少一个角色；如仅包含 R_FRONT_DESK 则为兜底前台
    const roles = infoData?.data?.roles || []
    const hasAnyRole = Array.isArray(roles) && roles.length > 0
    const onlyFrontDesk = hasAnyRole && roles.every((r) => r === 'R_FRONT_DESK')
    if (hasAnyRole) {
      console.log('OK: roles present ->', roles)
      if (onlyFrontDesk) console.log('Note: fallback to front desk (R_FRONT_DESK)')
    } else {
      console.warn('WARN: roles look suspicious ->', roles)
    }
  } catch (err) {
    console.error('Check failed:', err)
    process.exit(1)
  }
})()
