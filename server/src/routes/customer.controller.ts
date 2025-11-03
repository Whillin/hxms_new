import { Controller, Get, Post, Body, Query, Req, UseGuards, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, In } from 'typeorm'
import { JwtGuard } from '../auth/jwt.guard'
import { Customer } from '../customers/customer.entity'
import { DataScopeService } from '../common/data-scope.service'
import { Department } from '../departments/department.entity'

@Controller('api/customer')
export class CustomerController {
  constructor(
    @InjectRepository(Customer) private readonly repo: Repository<Customer>,
    @Inject(DataScopeService) private readonly dataScopeService: DataScopeService,
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>
  ) {}

  @UseGuards(JwtGuard)
  @Get('list')
  async list(@Req() req: any, @Query() query: any) {
    const current = Math.max(1, Number(query.current || 1))
    const size = Math.max(1, Math.min(100, Number(query.size || 10)))
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    const excluded = ['R_SALES', 'R_SALES_MANAGER', 'R_APPOINTMENT', 'R_FRONT_DESK']
    const hasExcluded = roles.some((r) => excluded.includes(String(r).trim()))
    if (hasExcluded) {
      return {
        code: 403,
        msg: '无权限查看客户列表',
        data: { records: [], total: 0, current, size }
      }
    }

    const scope = await this.dataScopeService.getScope(req.user)
    const allowedStoreIds = await this.dataScopeService.resolveAllowedStoreIds(scope)

    // 解析门店筛选参数
    const storeIdParam =
      query.storeId !== undefined && query.storeId !== '' ? Number(query.storeId) : undefined

    // 数据范围与门店过滤：
    // - 当 scope.level 为 'all'（管理员/信息岗），不限制门店；若传入 storeId 则按该值精确过滤
    // - 其他范围：若传入 storeId，需在可见门店集合内，否则返回空；未传入则按集合过滤
    const where: any = {}
    if (scope.level === 'all') {
      if (typeof storeIdParam === 'number' && !Number.isNaN(storeIdParam)) {
        where.storeId = storeIdParam
      }
    } else {
      if (typeof storeIdParam === 'number' && !Number.isNaN(storeIdParam)) {
        if (!allowedStoreIds.includes(storeIdParam)) {
          return {
            code: 200,
            msg: 'ok',
            data: { records: [], total: 0, current, size }
          }
        }
        where.storeId = storeIdParam
      } else {
        where.storeId = In(allowedStoreIds.length ? allowedStoreIds : [-1])
      }
    }

    // 搜索条件
    if (query.userName) where.name = Like(`%${String(query.userName)}%`)
    if (query.userPhone) where.phone = Like(`%${String(query.userPhone)}%`)
    if (query.userGender) where.gender = String(query.userGender)
    if (query.buyExperience) where.buyExperience = String(query.buyExperience)
    if (query.currentBrand) where.currentBrand = Like(`%${String(query.currentBrand)}%`)
    if (query.currentModel) where.currentModel = Like(`%${String(query.currentModel)}%`)

    const [records, total] = await this.repo.findAndCount({
      where,
      order: { updatedAt: 'DESC' },
      skip: (current - 1) * size,
      take: size
    })

    const payload = {
      records: records.map((r) => ({
        id: r.id,
        userName: r.name,
        userPhone: r.phone,
        userGender: r.gender,
        userAge: r.age,
        buyExperience: r.buyExperience,
        userPhoneModel: r.phoneModel || '',
        currentBrand: r.currentBrand || '',
        currentModel: r.currentModel || '',
        carAge: r.carAge,
        mileage: Number(r.mileage || 0),
        livingArea: r.livingArea || '',
        storeId: r.storeId
      })),
      total,
      current,
      size
    }

    return { code: 200, msg: 'ok', data: payload }
  }

  /** 返回当前用户允许的门店选项（受数据范围约束） */
  @UseGuards(JwtGuard)
  @Get('store-options')
  async storeOptions(@Req() req: any) {
    const scope = await this.dataScopeService.getScope(req.user)
    const allowedStoreIds = await this.dataScopeService.resolveAllowedStoreIds(scope)
    if (scope.level === 'all') {
      // 管理员/信息岗：返回全部门店
      const allStores = await this.deptRepo.find({ where: { type: 'store' as any } })
      const options = allStores.map((s) => ({ id: s.id, name: s.name }))
      return { code: 200, msg: 'ok', data: options }
    }
    if (!allowedStoreIds.length) return { code: 200, msg: 'ok', data: [] }
    const stores = await this.deptRepo.find({ where: { id: In(allowedStoreIds) } })
    const options = stores.map((s) => ({ id: s.id, name: s.name }))
    return { code: 200, msg: 'ok', data: options }
  }

  /** 编辑保存客户（仅支持更新已有记录） */
  @UseGuards(JwtGuard)
  @Post('save')
  async save(@Req() req: any, @Body() body: any) {
    const id = Number(body?.id)
    if (!id || Number.isNaN(id)) return { code: 400, msg: '缺少有效的ID', data: false }
    const exists = await this.repo.findOne({ where: { id } })
    if (!exists) return { code: 404, msg: '未找到客户', data: false }

    // 范围校验：必须有权操作该客户所在门店
    const scope = await this.dataScopeService.getScope(req.user)
    const allowedStoreIds = await this.dataScopeService.resolveAllowedStoreIds(scope)
    if (scope.level !== 'all') {
      if (!allowedStoreIds.length || !allowedStoreIds.includes(Number(exists.storeId))) {
        return { code: 403, msg: '无权编辑该门店客户', data: false }
      }
    }

    // 更新字段（不改门店归属）
    exists.name = String(body.userName ?? exists.name)
    exists.phone = String(body.userPhone ?? exists.phone)
    exists.gender = String(body.userGender ?? exists.gender) as any
    exists.age = Number(body.userAge ?? exists.age ?? 0)
    exists.buyExperience = String(body.buyExperience ?? exists.buyExperience) as any
    exists.phoneModel = body.userPhoneModel ?? exists.phoneModel
    exists.currentBrand = body.currentBrand ?? exists.currentBrand
    exists.currentModel = body.currentModel ?? exists.currentModel
    exists.carAge = Number(body.carAge ?? exists.carAge ?? 0)
    exists.mileage = Number(body.mileage ?? exists.mileage ?? 0)
    const livingArea = Array.isArray(body.livingArea)
      ? (body.livingArea as any[]).join('/')
      : String(body.livingArea ?? exists.livingArea ?? '')
    exists.livingArea = livingArea

    try {
      await this.repo.save(exists)
      return { code: 200, msg: '保存成功', data: true }
    } catch (err: any) {
      // 唯一约束：同门店+手机号+姓名
      if (err?.code === 'ER_DUP_ENTRY') {
        return { code: 400, msg: '该门店已存在相同姓名与手机号的客户', data: false }
      }
      throw err
    }
  }

  /** 删除客户 */
  @UseGuards(JwtGuard)
  @Post('delete')
  async delete(@Req() req: any, @Body() body: any) {
    const id = Number(body?.id)
    if (!id || Number.isNaN(id)) return { code: 400, msg: '缺少有效的ID', data: false }
    const exists = await this.repo.findOne({ where: { id } })
    if (!exists) return { code: 404, msg: '未找到客户', data: false }

    // 范围校验
    const scope = await this.dataScopeService.getScope(req.user)
    const allowedStoreIds = await this.dataScopeService.resolveAllowedStoreIds(scope)
    if (scope.level !== 'all') {
      if (!allowedStoreIds.length || !allowedStoreIds.includes(Number(exists.storeId))) {
        return { code: 403, msg: '无权删除该门店客户', data: false }
      }
    }

    await this.repo.delete(id)
    return { code: 200, msg: '删除成功', data: true }
  }
}
