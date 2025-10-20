import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthService } from './auth.service'
import { JwtGuard } from './jwt.guard'
import { AuthController } from '../routes/auth.controller'
import { UserModule } from '../users/user.module'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'hxms_dev_secret',
      signOptions: { expiresIn: '2h' }
    }),
    UserModule
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtGuard],
  exports: [AuthService, JwtModule, JwtGuard]
})
export class AuthModule {}
