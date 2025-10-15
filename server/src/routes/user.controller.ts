import { Controller, Get } from '@nestjs/common'

@Controller('api/user')
export class UserController {
  @Get('info')
  info() {
    return {
      buttons: ['B_ADD', 'B_EDIT', 'B_DELETE'],
      roles: ['R_ADMIN', 'R_SUPER'],
      userId: 1,
      userName: 'Admin'
    }
  }
}
