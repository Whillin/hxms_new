import { Body, Controller, Post, Get, Inject, Res } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from '../auth/auth.service'
import { UserService } from '../users/user.service'
import { LoginDto } from '../auth/dto/login.dto'
import { RegisterDto } from '../auth/dto/register.dto'
import type { Response } from 'express'

@Controller('api/auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(UserService) private readonly userService: UserService
  ) {}

  @Get('debug-di')
  debugDI() {
    return {
      code: 200,
      msg: 'ok',
      data: {
        hasAuthService: !!this.authService,
        hasUserService: !!this.userService
      }
    }
  }
  @Post('login')
  @Throttle({ login: { limit: 5, ttl: 60000 } }) // 登录接口：每分钟最多 5 次
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    try {
      const userName = body?.userName || body?.username || ''
      const password = body?.password || ''
      const user = await this.userService.findByUserName(userName)
      if (!user || !this.userService.verifyPassword(user, password) || !user.enabled) {
        return { code: 401, msg: '用户名或密码错误', data: null }
      }

      const payload = { sub: user.id, userName: user.userName, roles: user.roles }
      const token = this.authService.signToken(payload)
      const refreshToken = this.authService.signRefreshToken(payload)
      this.setRefreshCookie(res, refreshToken)
      return { code: 200, msg: '登录成功', data: { token, refreshToken } }
    } catch (e) {
      console.error('[AuthController.login] Unexpected error:', e)
      return { code: 500, msg: '登录服务异常，请稍后重试', data: null }
    }
  }

  @Post('register')
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const userName = body?.userName || body?.username || ''
    const password = body?.password || ''
    const name = body?.name || ''
    const phone = body?.phone || ''
    try {
      const record = await this.userService.createUser(userName, password, name, phone)
      const payload = { sub: record.id, userName: record.userName, roles: record.roles }
      const token = this.authService.signToken(payload)
      const refreshToken = this.authService.signRefreshToken(payload)
      this.setRefreshCookie(res, refreshToken)
      return { code: 200, msg: '注册成功', data: { token, refreshToken } }
    } catch (e: any) {
      return { code: 400, msg: e?.message || '注册失败', data: null }
    }
  }

  @Post('refresh')
  async refresh(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    try {
      const refreshToken = body?.refreshToken || ''
      const payload = this.authService.verifyRefreshToken(refreshToken)
      if (!payload) {
        return { code: 401, msg: '刷新令牌无效', data: null }
      }

      // 从数据库读取最新用户信息与角色，确保角色变更无需清理缓存即可生效
      const sub = Number((payload as any)?.sub)
      const byId = sub && !Number.isNaN(sub) ? await this.userService.findById(sub) : null
      const byName = !byId
        ? await this.userService.findByUserName((payload as any)?.userName || '')
        : null
      const record = byId || byName

      const roles = Array.isArray(record?.roles)
        ? record!.roles
        : Array.isArray((payload as any)?.roles)
          ? (payload as any).roles
          : []
      const cleanPayload = {
        sub: record?.id ?? (payload as any)?.sub,
        userName: record?.userName ?? (payload as any)?.userName,
        roles
      }
      const token = this.authService.signToken(cleanPayload)
      const newRefreshToken = this.authService.signRefreshToken(cleanPayload)
      this.setRefreshCookie(res, newRefreshToken)
      return { code: 200, msg: '刷新成功', data: { token, refreshToken: newRefreshToken } }
    } catch (e) {
      console.error('[AuthController.refresh] Unexpected error:', e)
      return { code: 500, msg: '刷新服务异常，请稍后重试', data: null }
    }
  }

  /** 将刷新令牌写入 HttpOnly Cookie，生产开启 Secure 与 Lax SameSite */
  private setRefreshCookie(res: Response, value: string) {
    try {
      const secure = (process.env.NODE_ENV === 'production') || String(process.env.COOKIE_SECURE).toLowerCase() === 'true'
      const domain = process.env.COOKIE_DOMAIN || undefined
      const maxAge = this.parseTtlToMs(process.env.JWT_REFRESH_EXPIRES_IN || '7d')
      res.cookie('refresh_token', value, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        domain,
        path: '/',
        maxAge
      })
    } catch (e) {
      // 静默容错：即便 Cookie 写入失败也返回 JSON 字段
      console.warn('[AuthController] setRefreshCookie failed:', e)
    }
  }

  /** 解析 7d/2h/30m/60s 等 TTL 字符串为毫秒数（默认 7 天） */
  private parseTtlToMs(s: string): number {
    const m = String(s).trim().match(/^(\d+)\s*([smhd])?$/i)
    if (!m) return 7 * 24 * 60 * 60 * 1000
    const n = Number(m[1])
    const unit = (m[2] || 'd').toLowerCase()
    const map: Record<string, number> = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }
    return n * (map[unit] || map['d'])
  }
}
