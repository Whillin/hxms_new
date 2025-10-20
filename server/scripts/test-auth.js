// Simple Node script to test login and fetching user info using server-issued JWT
// Uses global fetch available in Node >= 18

async function main() {
  const base = 'http://localhost:3002'
  try {
    const diagResp = await fetch(`${base}/api/auth/debug-di`)
    const diagText = await diagResp.text()
    let diagData
    try { diagData = JSON.parse(diagText) } catch {}
    console.log('DI status:', diagResp.status)
    console.log('DI data:', diagData)

    const loginResp = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName: 'Admin', password: '123456' })
    })
    const loginText = await loginResp.text()
    let loginData
    try {
      loginData = JSON.parse(loginText)
    } catch {
      console.log('Login response is not JSON:', loginText)
      return
    }
    console.log('Login status:', loginResp.status)
    console.log('Login data:', loginData)
    const token = loginData?.data?.token
    if (!token) {
      console.error('No token returned from login.')
      return
    }

    const infoResp = await fetch(`${base}/api/user/info`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const infoText = await infoResp.text()
    let infoData
    try {
      infoData = JSON.parse(infoText)
    } catch {
      console.log('Info response is not JSON:', infoText)
      return
    }
    console.log('Info status:', infoResp.status)
    console.log('Info data:', infoData)
  } catch (err) {
    console.error('Test failed:', err)
  }
}

main()