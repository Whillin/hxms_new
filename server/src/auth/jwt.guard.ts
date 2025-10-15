import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    const authHeader = (req.headers['authorization'] || req.headers['Authorization']) as
      | string
      | string[]
      | undefined

    if (!authHeader) throw new UnauthorizedException('Missing Authorization header')
    const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw

    const payload = this.authService.verifyToken(token)
    if (!payload) throw new UnauthorizedException('Invalid token')

    req.user = payload
    return true
  }
}
