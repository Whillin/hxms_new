import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthService } from './auth.service'
import { JwtGuard } from './jwt.guard'
import { AuthController } from '../routes/auth.controller'
import { UserModule } from '../users/user.module'

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'hxms_dev_secret',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '2h') as import('ms').StringValue }
    }),
    UserModule
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtGuard],
  exports: [AuthService, JwtModule, JwtGuard]
})
export class AuthModule {}
