import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { StringValue } from 'ms'

@Injectable()
export class AuthService {
  private readonly jwtService: JwtService
  constructor() {
    const accessTtlRaw = process.env.JWT_EXPIRES_IN || '2h'
    const accessTtl: StringValue = accessTtlRaw as StringValue
    this.jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'hxms_dev_secret',
      signOptions: { expiresIn: accessTtl }
    })
  }

  validateUser(userName: string, password: string): boolean {
    return Boolean(userName && password)
  }

  signToken(payload: Record<string, any>): string {
    return this.jwtService.sign(payload)
  }

  signRefreshToken(payload: Record<string, any>): string {
    const refreshTtlRaw = process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    const refreshTtl: StringValue = refreshTtlRaw as StringValue
    return this.jwtService.sign(payload, { expiresIn: refreshTtl })
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
