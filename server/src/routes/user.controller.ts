import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { JwtGuard } from '../auth/jwt.guard'

@Controller('api/user')
export class UserController {
  @UseGuards(JwtGuard)
  @Get('info')
  info(@Req() req: any) {
    const userName = req.user?.userName || 'Admin'
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : ['R_USER']
    const userId = req.user?.sub || 1
    return {
      code: 200,
      msg: 'ok',
      data: {
        buttons: ['B_ADD', 'B_EDIT', 'B_DELETE'],
        roles,
        userId,
        userName
      }
    }
  }
}
