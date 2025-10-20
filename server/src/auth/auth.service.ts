import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class AuthService {
  private readonly jwtService: JwtService
  constructor() {
    this.jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'hxms_dev_secret',
      signOptions: { expiresIn: '2h' }
    })
  }

  validateUser(userName: string, password: string): boolean {
    return Boolean(userName && password)
  }

  signToken(payload: Record<string, any>): string {
    return this.jwtService.sign(payload)
  }

  signRefreshToken(payload: Record<string, any>): string {
    return this.jwtService.sign(payload, { expiresIn: '7d' })
  }

  verifyToken(token: string): Record<string, any> | null {
    try {
      return this.jwtService.verify(token)
    } catch {
      return null
    }
  }

  verifyRefreshToken(refreshToken: string): Record<string, any> | null {
    try {
      return this.jwtService.verify(refreshToken)
    } catch {
      return null
    }
  }
}
