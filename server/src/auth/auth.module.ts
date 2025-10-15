import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthService } from './auth.service'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'hxms_dev_secret',
      signOptions: { expiresIn: '2h' }
    })
  ],
  providers: [AuthService],
  exports: [AuthService, JwtModule]
})
export class AuthModule {}
