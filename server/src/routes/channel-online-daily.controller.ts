import { Body, Controller, Get, Post, Query, Req, UseGuards, Inject } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In, Between } from 'typeorm'
import { JwtGuard } from '../auth/jwt.guard'
import { OnlineChannel } from '../channels/online-channel.entity'
import { OnlineChannelDaily } from '../channels/online-channel-daily.entity'
import { OnlineChannelDailyAllocation } from '../channels/online-channel-daily-allocation.entity'
import { Employee } from '../employees/employee.entity'
import { EmployeeStoreLink } from '../employees/employee-store.entity'
import { DataScopeService } from '../common/data-scope.service'

type AllocationItem = { employeeId: number; count: number }
type DailyItem = {
  compoundKey: string
  level1: string
  level2: string
  count: number
  allocations?: AllocationItem[]
}

@SkipThrottle()
@Controller('api/channel/online/daily')
export class ChannelOnlineDailyController {
  constructor(
    @InjectRepository(OnlineChannelDaily)
    private readonly dailyRepo: Repository<OnlineChannelDaily>,
    @InjectRepository(OnlineChannel) private readonly dictRepo: Repository<OnlineChannel>,
    @InjectRepository(OnlineChannelDailyAllocation)
    private readonly allocRepo: Repository<OnlineChannelDailyAllocation>,
    @InjectRepository(Employee) private readonly empRepo: Repository<Employee>,
    @InjectRepository(EmployeeStoreLink)
    private readonly empLinkRepo: Repository<EmployeeStoreLink>,
    @Inject(DataScopeService) private readonly dataScopeService: DataScopeService
  ) {}

  /** 若线上渠道字典为空，则按预设进行一次性填充 */
  private async seedDictIfEmpty() {
    const count = await this.dictRepo.count()
    if (count > 0) return
    const level1Sources: Record<string, string[]> = {
      新媒体: ['抖音', '微视', '小红书', '快手', '其他'],
      垂媒: ['懂车帝', '汽车之家', '易车', '其他'],
      品牌: ['品牌推荐']
    }
    const rows: OnlineChannel[] = []
    let sort = 1
    for (const [l1, l2list] of Object.entries(level1Sources)) {
      // 支持仅一级（空二级）占位
      const all = [''].concat(l2list)
      for (const l2 of all) {
        const compoundKey = `${l1}|${l2 || ''}`
        rows.push(
          this.dictRepo.create({
            level1: l1,
            level2: l2 || '',
            compoundKey,
            enabled: true,
            sort: sort++
          })
        )
      }
    }
    if (rows.length) await this.dictRepo.save(rows)
  }

  /** 统计字典中启用的渠道数量 */
  private async countEnabledChannels(): Promise<number> {
    await this.seedDictIfEmpty()
    const rows = await this.dictRepo.find({ where: { enabled: true } })
    const set = new Set<string>()
    for (const r of rows) set.add(`${r.level1}|${r.level2 || ''}`)
    return set.size
  }

  /** 检查某日是否完成（提交的记录数等于字典渠道数） */
  private async isDateCompleted(
    storeId: number,
    date: string
  ): Promise<{ completed: boolean; submittedCount: number; total: number }> {
    const total = await this.countEnabledChannels()
    const submittedCount = await this.dailyRepo.count({
      where: { storeId, date, submitted: true } as any
    })
    return { completed: submittedCount >= total && total > 0, submittedCount, total }
  }

  private isManagerOrDirector(roles: string[]): boolean {
    const list = Array.isArray(roles) ? roles : []
    // 扩展为管理员/超级管理员也可访问与编辑
    return (
      list.includes('R_STORE_MANAGER') ||
      list.includes('R_STORE_DIRECTOR') ||
      list.includes('R_ADMIN') ||
      list.includes('R_SUPER')
    )
  }

  /** 获取当日该店所有渠道的填报数据；为空则返回字典结构 */
  @UseGuards(JwtGuard)
  @SkipThrottle()
  @Get('list')
  async list(@Req() req: any, @Query() query: any) {
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    if (!this.isManagerOrDirector(roles)) {
      return { code: 403, msg: '仅店长/总监可访问', data: { records: [] } }
    }

    const scope = await this.dataScopeService.getScope(req.user)
    const allowed = await this.dataScopeService.resolveAllowedStoreIds(scope)
    const storeId = Number(query.storeId)
    const date = String(query.date || '').trim()
    if (!storeId || !date) return { code: 400, msg: '缺少 storeId 或 date', data: [] }
    if (!allowed.includes(storeId)) return { code: 403, msg: '无权访问该门店', data: [] }

    try {
      const records = await this.dailyRepo.find({ where: { storeId, date } })
      if (records.length) {
        // 查询分配并按 dailyId 聚合
        const dailyIds = records.map((r) => r.id)
        let allocs: OnlineChannelDailyAllocation[] = []
        if (dailyIds.length) {
          // 使用 In 以提升兼容性
          // 注意：TypeORM 会在 where 数组时做 OR 查询，这里统一使用 In
          const { In } = await import('typeorm')
          allocs = await this.allocRepo.find({ where: { dailyId: In(dailyIds) } as any })
        }
        const allocByDailyId = new Map<number, AllocationItem[]>()
        for (const a of allocs) {
          const list = allocByDailyId.get(a.dailyId) || []
          list.push({ employeeId: a.employeeId, count: a.count })
          allocByDailyId.set(a.dailyId, list)
        }
        const items = records.map((r) => ({
          compoundKey: r.compoundKey,
          level1: r.level1,
          level2: r.level2,
          count: r.count,
          allocations: allocByDailyId.get(r.id) || []
        }))
        const submitted = records.some((r) => r.submitted)
        return { code: 200, msg: '获取成功', data: { items, submitted } }
      }

      // 返回字典用于首次填报（并确保字典存在）
      await this.seedDictIfEmpty()
      const l1Raw = await this.dictRepo
        .createQueryBuilder('oc')
        .select('DISTINCT oc.level1', 'level1')
        .where('oc.enabled = 1')
        .orderBy('level1', 'ASC')
        .getRawMany()
      const level1: string[] = l1Raw.map((r: any) => r.level1)
      const items: DailyItem[] = []
      for (const l1 of level1) {
        const rows = await this.dictRepo.find({ where: { level1: l1, enabled: true } })
        const l2set = new Set<string>()
        for (const r of rows) {
          if (r.level2 && r.level2.trim() !== '') l2set.add(r.level2)
        }
        if (l2set.size === 0) {
          items.push({ compoundKey: `${l1}|`, level1: l1, level2: '', count: 0 })
        } else {
          for (const l2 of l2set)
            items.push({ compoundKey: `${l1}|${l2}`, level1: l1, level2: l2, count: 0 })
        }
      }
      return { code: 200, msg: '获取成功', data: { items, submitted: false } }
    } catch (err: any) {
      // 将底层异常转换为统一错误响应，避免直接抛出 500
      const msg =
        err?.code === 'ER_NO_SUCH_TABLE'
          ? '系统未初始化：缺少必要数据表，请初始化数据库后重试'
          : '服务器内部错误'
      return { code: 500, msg, data: { items: [], submitted: false } }
    }
  }

  /** 清理指定门店在日期或日期范围内的日报记录 */
  @UseGuards(JwtGuard)
  @Post('clear')
  async clear(@Req() req: any, @Body() body: any) {
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    if (!this.isManagerOrDirector(roles)) {
      return { code: 403, msg: '仅店长/总监/管理员可清理', data: { deleted: 0 } }
    }
    const scope = await this.dataScopeService.getScope(req.user)
    const allowed = await this.dataScopeService.resolveAllowedStoreIds(scope)
    const storeId = Number(body.storeId)
    const date = String(body.date || '').trim()
    const start = String(body.start || '').trim()
    const end = String(body.end || '').trim()
    if (!storeId) return { code: 400, msg: '缺少 storeId', data: { deleted: 0 } }
    if (!allowed.includes(storeId)) return { code: 403, msg: '无权访问该门店', data: { deleted: 0 } }

    const where: any = { storeId }
    if (date) where.date = date
    else if (start && end) where.date = Between(start, end)
    else return { code: 400, msg: '需提供 date 或 start+end', data: { deleted: 0 } }

    const rows = await this.dailyRepo.find({ where })
    if (!rows.length) return { code: 200, msg: '无匹配记录', data: { deleted: 0 } }
    const ids = rows.map((r) => r.id)
    await this.dailyRepo.delete(ids)
    return { code: 200, msg: '清理成功', data: { deleted: ids.length } }
  }

  /** 开放版清理（开发/演示用途） */
  @Post('clear/open')
  async clearOpen(@Body() body: any) {
    const storeId = Number(body.storeId)
    const date = String(body.date || '').trim()
    const start = String(body.start || '').trim()
    const end = String(body.end || '').trim()
    if (!storeId) return { code: 400, msg: '缺少 storeId', data: { deleted: 0 } }
    const where: any = { storeId }
    if (date) where.date = date
    else if (start && end) where.date = Between(start, end)
    else return { code: 400, msg: '需提供 date 或 start+end', data: { deleted: 0 } }
    const rows = await this.dailyRepo.find({ where })
    if (!rows.length) return { code: 200, msg: '无匹配记录', data: { deleted: 0 } }
    const ids = rows.map((r) => r.id)
    await this.dailyRepo.delete(ids)
    return { code: 200, msg: '清理成功', data: { deleted: ids.length } }
  }

  @Get('clear/open')
  async clearOpenGet(@Query() query: any) {
    const body = { storeId: Number(query.storeId || 0), date: String(query.date || ''), start: String(query.start || ''), end: String(query.end || '') }
    return await this.clearOpen(body)
  }

  @SkipThrottle()
  @Get('seed')
  async seed(@Query() query: any) {
    await this.seedDictIfEmpty()
    const storeId = Number(query.storeId || 1)
    const date = String(query.date || new Date().toISOString().slice(0, 10))
    const count = Math.max(0, Number(query.count || 50))
    const todayStr = new Date().toISOString().slice(0, 10)
    const isBackfill = date < todayStr
    const dict = await this.dictRepo.find({ where: { enabled: true } })
    const toSave: OnlineChannelDaily[] = []
    for (const d of dict) {
      const uniqueKey = `${storeId}|${date}|${d.compoundKey}`
      const existing = await this.dailyRepo.findOne({ where: { uniqueKey } })
      if (existing) {
        existing.count = count
        existing.submitted = true
        existing.isBackfill = isBackfill
        toSave.push(existing)
      } else {
        toSave.push(
          this.dailyRepo.create({
            storeId,
            date,
            compoundKey: d.compoundKey,
            level1: d.level1,
            level2: d.level2,
            count,
            isBackfill,
            submitted: true,
            uniqueKey
          })
        )
      }
    }
    if (toSave.length) await this.dailyRepo.save(toSave)
    return { code: 200, msg: 'ok', data: { storeId, date, channels: dict.length, count } }
  }

  /** 批量保存/更新当日数据；超过当日视为补录 */
  @UseGuards(JwtGuard)
  @Post('save')
  async save(@Req() req: any, @Body() body: any) {
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    if (!this.isManagerOrDirector(roles)) {
      return { code: 403, msg: '仅店长/总监可编辑', data: false }
    }

    const scope = await this.dataScopeService.getScope(req.user)
    const allowed = await this.dataScopeService.resolveAllowedStoreIds(scope)
    const userId = Number(req.user?.sub)
    const storeId = Number(body.storeId)
    const date = String(body.date || '').trim()
    const items: DailyItem[] = Array.isArray(body.items) ? body.items : []
    const submitted: boolean = Boolean(body.submitted)
    if (!storeId || !date || items.length === 0)
      return { code: 400, msg: '缺少参数或无记录', data: false }
    if (!allowed.includes(storeId)) return { code: 403, msg: '无权编辑该门店', data: false }

    const todayStr = new Date().toISOString().slice(0, 10)
    const isBackfill = date < todayStr

    const toSave: OnlineChannelDaily[] = []
    const allocationsByCompound: Record<string, AllocationItem[]> = {}
    for (const it of items) {
      const uniqueKey = `${storeId}|${date}|${it.compoundKey}`
      const existing = await this.dailyRepo.findOne({ where: { uniqueKey } })
      if (existing) {
        existing.count = Math.max(0, Number(it.count || 0))
        existing.updatedBy = userId
        existing.submitted = submitted ? true : existing.submitted
        existing.isBackfill = isBackfill
        toSave.push(existing)
      } else {
        const row = this.dailyRepo.create({
          storeId,
          date,
          compoundKey: it.compoundKey,
          level1: it.level1,
          level2: it.level2,
          count: Math.max(0, Number(it.count || 0)),
          isBackfill,
          submitted,
          createdBy: userId,
          updatedBy: userId,
          uniqueKey
        })
        toSave.push(row)
      }
      // 暂存分配（若提供）
      if (Array.isArray((it as any).allocations)) {
        allocationsByCompound[it.compoundKey] = (it.allocations as AllocationItem[]).filter(
          (a) => a && typeof a.employeeId === 'number' && typeof a.count === 'number'
        )
      }
    }

    // 先保存/更新每日记录，拿到 id
    const saved = toSave.length ? await this.dailyRepo.save(toSave) : []

    // 构建辅助映射：compoundKey -> saved row
    const savedByCompound = new Map<string, OnlineChannelDaily>()
    for (const r of saved) savedByCompound.set(r.compoundKey, r)

    // 校验角色白名单与员工归属
    const roleAllowed = new Set(['R_APPOINTMENT', 'R_SALES', 'R_SALES_MANAGER'])
    const isEmpInStore = async (empId: number, sid: number): Promise<boolean> => {
      const emp = await this.empRepo.findOne({ where: { id: empId } })
      if (!emp || String(emp.status || '') !== '1') return false
      if (Number(emp.storeId) === Number(sid)) return true
      const link = await this.empLinkRepo.findOne({ where: { employeeId: empId, storeId: sid } })
      return !!link
    }
    const deriveRoleCode = async (empId: number): Promise<string> => {
      const emp = await this.empRepo.findOne({ where: { id: empId } })
      return String(emp?.role || '')
    }

    // 幂等替换分配集：若提供 allocations，则先删除该 dailyId 旧分配，再保存新分配
    for (const [compoundKey, allocsRaw] of Object.entries(allocationsByCompound)) {
      const row = savedByCompound.get(compoundKey)
      if (!row) continue
      const allocs = Array.isArray(allocsRaw) ? allocsRaw : []
      const totalAssigned = allocs.reduce((s, a) => s + Math.max(0, Number(a.count || 0)), 0)
      // 校验总数关系：提交时必须相等；草稿可不超过
      if (submitted) {
        if (totalAssigned !== Number(row.count)) {
          return { code: 400, msg: `分配总数必须等于该渠道的总数：${compoundKey}`, data: false }
        }
      } else if (totalAssigned > Number(row.count)) {
        return { code: 400, msg: `分配总数不能超过填报数量：${compoundKey}`, data: false }
      }
      // 角色与员工合法性校验
      for (const a of allocs) {
        const roleCode = await deriveRoleCode(Number(a.employeeId))
        if (!roleAllowed.has(String(roleCode))) {
          return { code: 400, msg: `不支持的角色分配：${roleCode}`, data: false }
        }
        const ok = await isEmpInStore(Number(a.employeeId), Number(storeId))
        if (!ok) return { code: 400, msg: '分配对象不在当前门店或已离职', data: false }
      }

      // 删除旧分配
      await this.allocRepo.delete({ dailyId: row.id })
      // 插入新分配（构建唯一键）
      const toInsert: OnlineChannelDailyAllocation[] = []
      for (const a of allocs) {
        // 构建唯一键，不落库角色字段
        toInsert.push(
          this.allocRepo.create({
            dailyId: row.id,
            employeeId: Number(a.employeeId),
            count: Math.max(0, Number(a.count || 0)),
            createdBy: userId,
            updatedBy: userId,
            uniqueKey: `${row.id}|${Number(a.employeeId)}`
          })
        )
      }
      if (toInsert.length) await this.allocRepo.save(toInsert)
    }

    return { code: 200, msg: '保存成功', data: true }
  }

  /** 今日完成度：用于首页红角标与菜单红点提示 */
  @UseGuards(JwtGuard)
  @SkipThrottle()
  @Get('today/completion')
  async todayCompletion(@Req() req: any, @Query() query: any) {
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    if (!this.isManagerOrDirector(roles)) {
      return { code: 403, msg: '仅店长/总监可访问', data: { incomplete: false } }
    }

    const scope = await this.dataScopeService.getScope(req.user)
    const allowed = await this.dataScopeService.resolveAllowedStoreIds(scope)
    const storeId = Number(query.storeId)
    if (!storeId) return { code: 400, msg: '缺少 storeId', data: { incomplete: false } }
    if (!allowed.includes(storeId))
      return { code: 403, msg: '无权访问该门店', data: { incomplete: false } }

    const today = new Date().toISOString().slice(0, 10)
    const { completed, submittedCount, total } = await this.isDateCompleted(storeId, today)
    return {
      code: 200,
      msg: 'OK',
      data: { date: today, incomplete: !completed, submittedCount, total }
    }
  }

  /** 缺失天数筛查：按门店与日期范围返回未完成的日期列表 */
  @UseGuards(JwtGuard)
  @SkipThrottle()
  @Get('missing-days')
  async missingDays(@Req() req: any, @Query() query: any) {
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    if (!this.isManagerOrDirector(roles)) {
      return { code: 403, msg: '仅店长/总监可访问', data: [] }
    }

    const scope = await this.dataScopeService.getScope(req.user)
    const allowed = await this.dataScopeService.resolveAllowedStoreIds(scope)
    const storeId = Number(query.storeId)
    const start = String(query.start || '').trim()
    const end = String(query.end || '').trim()
    if (!storeId || !start || !end) return { code: 400, msg: '缺少 storeId 或日期范围', data: [] }
    if (!allowed.includes(storeId)) return { code: 403, msg: '无权访问该门店', data: [] }

    const toDate = (s: string) => new Date(s + 'T00:00:00')
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const s = toDate(start)
    const e = toDate(end)
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e)
      return { code: 400, msg: '日期范围不合法', data: [] }

    const missing: string[] = []
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const dateStr = fmt(d)
      const { completed } = await this.isDateCompleted(storeId, dateStr)
      if (!completed) missing.push(dateStr)
    }

    return { code: 200, msg: 'OK', data: { missing, count: missing.length, range: { start, end } } }
  }

  @UseGuards(JwtGuard)
  @Get('weekly-total')
  async weeklyTotal(@Req() req: any, @Query() query: any) {
    const scope = await this.dataScopeService.getScope(req.user)
    const allowed = await this.dataScopeService.resolveAllowedStoreIds(scope)
    const storeId = Number(query.storeId || 0)
    const now = new Date()
    const day = now.getDay()
    const diffToMonday = (day + 6) % 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - diffToMonday)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    const prevMonday = new Date(monday)
    prevMonday.setDate(monday.getDate() - 7)
    const prevSunday = new Date(sunday)
    prevSunday.setDate(sunday.getDate() - 7)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const whereCur: any = { date: Between(fmt(monday), fmt(sunday)) }
    const wherePrev: any = { date: Between(fmt(prevMonday), fmt(prevSunday)) }
    if (storeId) {
      if (scope.level !== 'all' && (!allowed.length || !allowed.includes(storeId))) {
        return { code: 403, msg: '无权访问该门店', data: { count: 0, changePercent: 0 } }
      }
      whereCur.storeId = storeId
      wherePrev.storeId = storeId
    } else if (allowed.length) {
      whereCur.storeId = In(allowed)
      wherePrev.storeId = In(allowed)
    }
    const cur = await this.dailyRepo.count({ where: whereCur })
    const prev = await this.dailyRepo.count({ where: wherePrev })
    const changePercent = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100)
    return { code: 200, msg: 'ok', data: { count: cur, changePercent } }
  }
}
