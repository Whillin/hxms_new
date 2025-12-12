import { Controller, Get, Req, UseGuards, Query, Post, Body, Inject } from '@nestjs/common'
import { JwtGuard } from '../auth/jwt.guard'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Role } from '../roles/role.entity'
import { RolePermission } from '../roles/role-permission.entity'
import { UserService } from '../users/user.service'

@Controller('api/user')
export class UserController {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission) private readonly permRepo: Repository<RolePermission>,
    @Inject(UserService) private readonly userService: UserService
  ) {}

  @UseGuards(JwtGuard)
  @Get('info')
  async info(@Req() req: any) {
    const userName = req.user?.userName
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : []
    const userId = req.user?.sub
    if (!userName || !userId) {
      return { code: 401, msg: '未登录', data: null }
    }

    const sanitizedRoles = await this.userService.sanitizeRoles(roles)
    const effectiveRoles =
      sanitizedRoles.includes('R_ADMIN') && !sanitizedRoles.includes('R_SUPER')
        ? [...sanitizedRoles, 'R_SUPER']
        : sanitizedRoles

    let buttons: string[] = []
    try {
      if (effectiveRoles.length) {
        const roleRecords = await this.roleRepo.find({ where: { roleCode: In(effectiveRoles) } })
        const roleIds = roleRecords.map((r) => r.id)
        if (roleIds.length) {
          const perms = await this.permRepo.find({ where: { roleId: In(roleIds) } })
          buttons = Array.from(new Set(perms.map((p) => p.permissionKey)))
        }
      }
    } catch {
      buttons = []
    }

    const ensure = (list: string[]) => Array.from(new Set([...(buttons || []), ...list]))
    if (effectiveRoles.includes('R_FRONT_DESK')) {
      buttons = ensure(['add', 'view'])
    }
    if (effectiveRoles.includes('R_INFO')) {
      buttons = ensure(['add', 'edit', 'delete', 'import', 'export', 'view'])
    }

    return {
      code: 200,
      msg: 'ok',
      data: {
        buttons,
        roles: effectiveRoles,
        userId,
        userName
      }
    }
  }
}