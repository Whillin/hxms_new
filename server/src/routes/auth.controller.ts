import { Body, Controller, Post } from '@nestjs/common'
import { AuthService } from '../auth/auth.service'
import { UserService } from '../users/user.service'
import { LoginDto } from '../auth/dto/login.dto'
import { RegisterDto } from '../auth/dto/register.dto'

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) {}
  @Post('login')
  async login(@Body() body: LoginDto) {
    const userName = body?.userName || body?.username || ''
    const password = body?.password || ''
    const user = await this.userService.findByUserName(userName)
    if (!user || !this.userService.verifyPassword(user, password) || !user.enabled) {
      return { code: 401, msg: '用户名或密码错误', data: null }
    }

    const payload = { sub: user.id, userName: user.userName, roles: user.roles }
    const token = this.authService.signToken(payload)
    const refreshToken = this.authService.signRefreshToken(payload)
    return { code: 200, msg: '登录成功', data: { token, refreshToken } }
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const userName = body?.userName || body?.username || ''
    const password = body?.password || ''
    try {
      const record = await this.userService.createUser(userName, password)
      const payload = { sub: record.id, userName: record.userName, roles: record.roles }
      const token = this.authService.signToken(payload)
      const refreshToken = this.authService.signRefreshToken(payload)
      return { code: 200, msg: '注册成功', data: { token, refreshToken } }
    } catch (e: any) {
      return { code: 400, msg: e?.message || '注册失败', data: null }
    }
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
