import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class JwtGuard implements CanActivate {
  private readonly jwtService: JwtService
  constructor() {
    this.jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'hxms_dev_secret',
      signOptions: { expiresIn: '2h' }
    })
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    const authHeader = (req.headers['authorization'] || req.headers['Authorization']) as
      | string
      | string[]
      | undefined

    if (!authHeader) throw new UnauthorizedException('Missing Authorization header')
    const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw

    let payload: Record<string, any> | null = null
    try {
      payload = this.jwtService.verify(token)
    } catch {
      payload = null
    }
    if (!payload) throw new UnauthorizedException('Invalid token')

    req.user = payload
    return true
  }
}
