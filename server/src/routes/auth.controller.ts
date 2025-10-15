import { Body, Controller, Post } from '@nestjs/common'

@Controller('api/auth')
export class AuthController {
  @Post('login')
  login(@Body() body: any) {
    const userName = body?.userName || 'Admin'
    const token = `mock-token-${userName}-${Date.now()}`
    const refreshToken = `mock-refresh-${Date.now()}`
    return { code: 200, msg: '登录成功', data: { token, refreshToken } }
  }
}
