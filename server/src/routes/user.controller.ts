import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { JwtGuard } from '../auth/jwt.guard'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Role } from '../roles/role.entity'
import { RolePermission } from '../roles/role-permission.entity'

@Controller('api/user')
export class UserController {
  // 注入角色与角色权限仓库，用于按角色聚合权限键
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission) private readonly permRepo: Repository<RolePermission>
  ) {}

  @UseGuards(JwtGuard)
  @Get('info')
  async info(@Req() req: any) {
    const userName = req.user?.userName || 'Admin'
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : ['R_USER']
    const userId = req.user?.sub || 1

    // 根据角色编码映射到角色ID，再聚合角色权限键
    let buttons: string[] = []
    try {
      if (roles.length) {
        const roleRecords = await this.roleRepo.find({ where: { roleCode: In(roles) } })
        const roleIds = roleRecords.map((r) => r.id)
        if (roleIds.length) {
          const perms = await this.permRepo.find({ where: { roleId: In(roleIds) } })
          buttons = Array.from(new Set(perms.map((p) => p.permissionKey)))
        }
      }
    } catch {
      // 兜底：出错时返回空按钮列表，避免接口异常
      buttons = []
    }

    // 默认按钮权限兜底：前台与信息部门
    const ensure = (list: string[]) => Array.from(new Set([...(buttons || []), ...list]))
    if (roles.includes('R_FRONT_DESK')) {
      // 前台：仅新增与查看
      buttons = ensure(['add', 'view'])
    }
    if (roles.includes('R_INFO')) {
      // 信息部门：拥有所有常用按钮权限
      buttons = ensure(['add', 'edit', 'delete', 'import', 'export', 'view'])
    }

    return {
      code: 200,
      msg: 'ok',
      data: {
        buttons,
        roles,
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
}
