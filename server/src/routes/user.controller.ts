import { Controller, Get, Req, UseGuards, Query, Post, Body, Inject } from '@nestjs/common'
import { JwtGuard } from '../auth/jwt.guard'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Role } from '../roles/role.entity'
import { RolePermission } from '../roles/role-permission.entity'
import { UserService } from '../users/user.service'

@Controller('api/user')
export class UserController {
  // 注入角色与角色权限仓库，用于按角色聚合权限键
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission) private readonly permRepo: Repository<RolePermission>,
    @Inject(UserService) private readonly userService: UserService
  ) {}

  @UseGuards(JwtGuard)
  @Get('info')
  async info(@Req() req: any) {
    const userName = req.user?.userName || 'Admin'
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : []
    const userId = req.user?.sub || 1

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

  // 调试接口：返回解析后的用户与请求头，便于定位 500
  @UseGuards(JwtGuard)
  @Get('debug')
  debug(@Req() req: any) {
    return {
      code: 200,
      msg: 'ok',
      data: {
        user: req.user ?? null,
        headers: req.headers ?? {}
      }
    }
  }

  // 用户管理：分页列表
  @UseGuards(JwtGuard)
  @Get('list')
  async list(@Query() query: any) {
    const data = await this.userService.listUsers(query || {})
    return { code: 200, msg: '获取成功', data }
  }

  // 用户管理：删除用户
  @UseGuards(JwtGuard)
  @Post('delete')
  async delete(@Body() body: { id?: number }) {
    const id = Number(body?.id)
    if (!id || Number.isNaN(id)) {
      return { code: 400, msg: '缺少有效的ID', data: false }
    }
    const ok = await this.userService.deleteById(id)
    if (!ok) return { code: 404, msg: '未找到用户', data: false }
    return { code: 200, msg: '删除成功', data: true }
  }
}
