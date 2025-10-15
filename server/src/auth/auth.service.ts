import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  validateUser(userName: string, password: string): boolean {
    return Boolean(userName && password)
  }

  signToken(payload: Record<string, any>): string {
    return this.jwtService.sign(payload)
  }

  verifyToken(token: string): Record<string, any> | null {
    try {
      return this.jwtService.verify(token)
    } catch {
      return null
    }
  }
}
