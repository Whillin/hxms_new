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
    // 默认不赋任何角色，交由 sanitizeRoles 兜底前台
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : []
    const userId = req.user?.sub || 1

    // 清洗并兜底角色（过滤已删除角色，必要时追加 R_FRONT_DESK）
    const sanitizedRoles = await this.userService.sanitizeRoles(roles)

    // 根据角色编码映射到角色ID，再聚合角色权限键
    let buttons: string[] = []
    try {
      if (sanitizedRoles.length) {
        const roleRecords = await this.roleRepo.find({ where: { roleCode: In(sanitizedRoles) } })
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
    if (sanitizedRoles.includes('R_FRONT_DESK')) {
      // 前台：仅新增与查看
      buttons = ensure(['add', 'view'])
    }
    if (sanitizedRoles.includes('R_INFO')) {
      // 信息部门：拥有所有常用按钮权限
      buttons = ensure(['add', 'edit', 'delete', 'import', 'export', 'view'])
    }

    return {
      code: 200,
      msg: 'ok',
      data: {
        buttons,
        roles: sanitizedRoles,
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
