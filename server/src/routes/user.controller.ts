import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { JwtGuard } from '../auth/jwt.guard'

@Controller('api/user')
export class UserController {
  @UseGuards(JwtGuard)
  @Get('info')
  info(@Req() req: any) {
    const userName = req.user?.userName || 'Admin'
    return {
      buttons: ['B_ADD', 'B_EDIT', 'B_DELETE'],
      roles: ['R_ADMIN', 'R_SUPER'],
      userId: 1,
      userName
    }
  }
}
