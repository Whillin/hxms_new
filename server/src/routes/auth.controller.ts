import { Body, Controller, Post } from '@nestjs/common'
import { AuthService } from '../auth/auth.service'

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('login')
  login(@Body() body: any) {
    const userName = body?.userName || body?.username || 'Admin'
    const password = body?.password || ''
    if (!this.authService.validateUser(userName, password)) {
      return { code: 401, msg: '用户名或密码错误', data: null }
    }

    const payload = { sub: 1, userName, roles: ['R_ADMIN', 'R_SUPER'] }
    const token = this.authService.signToken(payload)
    const refreshToken = this.authService.signRefreshToken(payload)
    return { code: 200, msg: '登录成功', data: { token, refreshToken } }
  }

  @Post('refresh')
  refresh(@Body() body: any) {
    const refreshToken = body?.refreshToken || ''
    const payload = this.authService.verifyRefreshToken(refreshToken)
    if (!payload) {
      return { code: 401, msg: '刷新令牌无效', data: null }
    }

    const token = this.authService.signToken(payload)
    const newRefreshToken = this.authService.signRefreshToken(payload)
    return { code: 200, msg: '刷新成功', data: { token, refreshToken: newRefreshToken } }
  }
}
