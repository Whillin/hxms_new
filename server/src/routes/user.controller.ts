import { Controller, Get, Req, UseGuards, Query, Post, Body, Inject } from '@nestjs/common'
import { JwtGuard } from '../auth/jwt.guard'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Role } from '../roles/role.entity'
import { RolePermission } from '../roles/role-permission.entity'
import { UserService } from '../users/user.service'
import { Employee } from '../employees/employee.entity'
import { Department } from '../departments/department.entity'

@Controller('api/user')
export class UserController {
  // 注入角色与角色权限仓库，用于按角色聚合权限键
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission) private readonly permRepo: Repository<RolePermission>,
    @Inject(UserService) private readonly userService: UserService,
    @InjectRepository(Employee) private readonly empRepo: Repository<Employee>,
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>
  ) {}

  @UseGuards(JwtGuard)
  @Get('info')
  async info(@Req() req: any) {
    let userName = req.user?.userName
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : []
    const userId = req.user?.sub
    if (!userName || !userId) {
      return { code: 401, msg: '未登录', data: null }
    }

    const sanitizedRoles = await this.userService.sanitizeRoles(roles)
    const rolesSet = new Set<string>(sanitizedRoles)
    const uname = String(userName || '')
    const needAdmin = uname.toLowerCase() === 'admin'
    // 仅在用户名为 admin 时，确保拥有 R_ADMIN；不再默认追加 R_SUPER
    if (needAdmin) {
      rolesSet.add('R_ADMIN')
    }
    // 角色以数据库与 sanitize 为准，不进行超管自动提升
    const effectiveRoles = Array.from(rolesSet)

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
    // 销售岗位：销售经理、销售顾问拥有线索管理的所有前端操作权限
    if (effectiveRoles.includes('R_SALES_MANAGER') || effectiveRoles.includes('R_SALES')) {
      buttons = ensure(['add', 'edit', 'delete', 'import', 'export', 'view'])
    }

    // 追加：返回关联员工与归属门店，管理员不解析员工范围
    let employeeId: number | undefined
    let storeId: number | undefined
    let email: string | undefined
    let brandId: number | undefined
    let brandName: string | undefined
    const isAdminUser = effectiveRoles.includes('R_ADMIN') || effectiveRoles.includes('R_SUPER')
    if (!isAdminUser) {
      try {
        const user = await this.userService.findById(Number(userId))
        userName = user?.userName || userName
        employeeId = user?.employeeId
        email = user?.email ?? undefined
        if (typeof employeeId === 'number') {
          const emp = await this.empRepo.findOne({ where: { id: employeeId } })
          storeId = emp?.storeId
          brandId = (emp as any)?.brandId
          if (typeof brandId === 'number') {
            const brandDept = await this.deptRepo.findOne({ where: { id: brandId } })
            brandName = brandDept?.name
          }
        }
      } catch (err) {
        console.warn('user.info failed to resolve employee/store', err)
      }
    } else {
      const user = await this.userService.findById(Number(userId))
      userName = user?.userName || userName
      email = user?.email ?? undefined
    }

    return {
      code: 200,
      msg: 'ok',
      data: {
        buttons,
        roles: effectiveRoles,
        userId,
        userName,
        email,
        employeeId,
        storeId,
        brandId,
        brandName
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

  // 管理员：保存用户（新增或编辑）
  @UseGuards(JwtGuard)
  @Post('save')
  async save(@Req() req: any, @Body() body: any) {
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : []
    const effectiveRoles = await this.userService.sanitizeRoles(roles)
    const isAdmin = effectiveRoles.includes('R_ADMIN') || effectiveRoles.includes('R_SUPER')
    if (!isAdmin) {
      return { code: 403, msg: '无权限', data: null }
    }

    try {
      const id = Number(body?.id)
      const isEdit = id && !Number.isNaN(id)

      // 提取表单字段
      const userName = String(body?.userName || body?.username || '').trim()
      const phone = String(body?.phone || body?.userPhone || '').trim()
      const gender = String(body?.gender || body?.userGender || '').trim() // '男'/'女' or 'male'/'female'
      const roleList = Array.isArray(body?.role)
        ? body.role
        : Array.isArray(body?.userRoles)
          ? body.userRoles
          : []

      if (!userName) return { code: 400, msg: '用户名不能为空', data: false }

      let user
      if (isEdit) {
        user = await this.userService.findById(id)
        if (!user) return { code: 404, msg: '用户不存在', data: false }
      } else {
        // 新增用户逻辑暂未完全适配前端（缺少密码/真实姓名），此处仅处理编辑
        // 如果需要新增，需完善 createUser 逻辑
        return { code: 400, msg: '暂不支持新增用户，请确保是对现有用户进行编辑', data: false }
      }

      // 更新用户表字段
      if (userName && userName !== user.userName) {
        // 检查用户名唯一性
        const exist = await this.userService.findByUserName(userName)
        if (exist && exist.id !== user.id) {
          return { code: 400, msg: '用户名已存在', data: false }
        }
        user.userName = userName
      }

      // 更新角色
      if (roleList.length > 0) {
        user.roles = await this.userService.sanitizeRoles(roleList)
      } else {
        // 如果传入空角色数组，可能意味着清空非默认角色
        // sanitizeRoles 会兜底 R_FRONT_DESK，符合预期
        user.roles = await this.userService.sanitizeRoles([])
      }

      await this.userService.save(user)

      // 更新关联员工表字段（手机号、性别）
      if (user.employeeId) {
        const emp = await this.empRepo.findOne({ where: { id: user.employeeId } })
        if (emp) {
          let changed = false
          if (phone && emp.phone !== phone) {
            emp.phone = phone
            changed = true
          }
          // 处理性别映射：前端可能是 '男'/'女' 或 'male'/'female'
          let targetGender = ''
          if (gender === '男' || gender === 'male') targetGender = 'male'
          if (gender === '女' || gender === 'female') targetGender = 'female'

          if (targetGender && emp.gender !== targetGender) {
            emp.gender = targetGender as any
            changed = true
          }

          if (changed) {
            await this.empRepo.save(emp)
          }
        }
      }

      return { code: 200, msg: '保存成功', data: true }
    } catch (e) {
      console.error('[UserController.save] error:', e)
      return { code: 500, msg: '保存失败', data: false }
    }
  }

  // 管理员：按用户名重置密码
  @UseGuards(JwtGuard)
  @Post('reset-password')
  async resetPassword(@Req() req: any, @Body() body: any) {
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : []
    const effectiveRoles = await this.userService.sanitizeRoles(roles)
    const isAdmin = effectiveRoles.includes('R_ADMIN') || effectiveRoles.includes('R_SUPER')
    if (!isAdmin) {
      return { code: 403, msg: '无权限', data: null }
    }

    const newPassword = body?.newPassword || body?.password || ''
    const userId = Number(body?.id || body?.userId)
    const userName = body?.userName || body?.username || ''
    if (!newPassword || (!userId && !userName)) {
      return { code: 400, msg: '缺少必要参数', data: null }
    }
    let ok = false
    if (userId && !Number.isNaN(userId)) {
      ok = await this.userService.resetPasswordByUserId(userId, newPassword)
    } else {
      ok = await this.userService.resetPasswordByUserName(userName, newPassword)
    }
    if (!ok) return { code: 404, msg: '未找到用户', data: false }
    return { code: 200, msg: '重置成功', data: true }
  }

  /** 个人资料：获取自己的资料（综合用户与员工信息） */
  @UseGuards(JwtGuard)
  @Get('profile')
  async getProfile(@Req() req: any) {
    try {
      const userId = Number(req?.user?.sub)
      if (!userId || Number.isNaN(userId)) {
        return { code: 401, msg: '未登录', data: null }
      }
      const user = await this.userService.findById(userId)
      if (!user) return { code: 404, msg: '用户不存在', data: null }

      const emp = user?.employeeId
        ? await this.empRepo.findOne({ where: { id: user.employeeId } })
        : null

      const sexMap: Record<string, string> = { male: '1', female: '2' }
      const sex = emp?.gender ? sexMap[emp.gender] || '' : ''

      // 组织路径：brand -> region -> store -> department
      let orgPath = ''
      try {
        const names: string[] = []
        if (emp?.brandId) {
          const d = await this.deptRepo.findOne({ where: { id: emp.brandId } })
          if (d?.name) names.push(d.name)
        }
        if (emp?.regionId) {
          const d = await this.deptRepo.findOne({ where: { id: emp.regionId } })
          if (d?.name) names.push(d.name)
        }
        if (emp?.storeId) {
          const d = await this.deptRepo.findOne({ where: { id: emp.storeId } })
          if (d?.name) names.push(d.name)
        }
        if (emp?.departmentId) {
          const d = await this.deptRepo.findOne({ where: { id: emp.departmentId } })
          if (d?.name) names.push(d.name)
        }
        orgPath = names.filter(Boolean).join(' - ')
      } catch {
        void 0
      }

      const data = {
        realName: emp?.name || user.nickname || user.userName,
        nickName: user.nickname || emp?.name || '',
        email: user.email || '',
        mobile: emp?.phone || '',
        address: user.address || '',
        sex,
        des: user.bio || '',
        position: emp?.role || '',
        orgPath
      }
      return { code: 200, msg: '获取成功', data }
    } catch (e) {
      console.error('[UserController.getProfile] error:', e)
      return { code: 500, msg: '服务异常', data: null }
    }
  }

  /** 个人资料：保存自己的资料（用户表+员工表） */
  @UseGuards(JwtGuard)
  @Post('profile')
  async saveProfile(
    @Req() req: any,
    @Body()
    body: {
      realName?: string
      nickName?: string
      email?: string
      mobile?: string
      address?: string
      sex?: string // '1' | '2'
      des?: string
    }
  ) {
    try {
      const userId = Number(req?.user?.sub)
      if (!userId || Number.isNaN(userId)) {
        return { code: 401, msg: '未登录', data: false }
      }
      const user = await this.userService.findById(userId)
      if (!user) return { code: 404, msg: '用户不存在', data: false }

      const { realName, nickName, email, mobile, address, sex, des } = body || {}
      const emailOk = !email || /.+@.+\..+/.test(String(email))
      if (!emailOk) return { code: 400, msg: '邮箱格式不正确', data: false }

      user.email = email ?? user.email
      user.nickname = nickName ?? user.nickname
      user.address = address ?? user.address
      user.bio = des ?? user.bio
      await this.userService.save(user)

      if (user.employeeId) {
        const emp = await this.empRepo.findOne({ where: { id: user.employeeId } })
        if (emp) {
          if (realName) emp.name = realName
          if (mobile) emp.phone = mobile
          if (sex === '1') emp.gender = 'male'
          if (sex === '2') emp.gender = 'female'
          await this.empRepo.save(emp)
        }
      }

      return await this.getProfile(req)
    } catch (e) {
      console.error('[UserController.saveProfile] error:', e)
      return { code: 500, msg: '保存失败', data: false }
    }
  }

  /** 个人改密：校验原密码并保存新密码 */
  @UseGuards(JwtGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: any,
    @Body() body: { currentPassword?: string; newPassword?: string; confirmPassword?: string }
  ) {
    try {
      const userId = Number(req?.user?.sub)
      if (!userId || Number.isNaN(userId)) return { code: 401, msg: '未登录', data: false }
      const user = await this.userService.findById(userId)
      if (!user) return { code: 404, msg: '用户不存在', data: false }

      const current = String(body?.currentPassword || '')
      const next = String(body?.newPassword || '')
      const confirm = String(body?.confirmPassword || '')
      if (!current || !next || !confirm) {
        return { code: 400, msg: '缺少必要参数', data: false }
      }
      if (next !== confirm) {
        return { code: 400, msg: '两次新密码不一致', data: false }
      }
      if (!this.userService.verifyPassword(user, current)) {
        return { code: 403, msg: '原密码不正确', data: false }
      }
      const ok = await this.userService.resetPasswordByUserId(user.id, next)
      return { code: 200, msg: ok ? '修改成功' : '修改失败', data: ok }
    } catch (e) {
      console.error('[UserController.changePassword] error:', e)
      return { code: 500, msg: '服务异常', data: false }
    }
  }
}
