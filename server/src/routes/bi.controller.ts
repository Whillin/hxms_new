import { Controller, Get, Query, Req, UseGuards, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtGuard } from '../auth/jwt.guard'
import { Clue } from '../clues/clue.entity'
import { Opportunity } from '../opportunities/opportunity.entity'
import { DataScopeService } from '../common/data-scope.service'
import { OnlineChannelDaily } from '../channels/online-channel-daily.entity'
import { OnlineChannel } from '../channels/online-channel.entity'
import { AiService } from '../common/ai.service'

@Controller('api/bi')
export class BiController {
  constructor(
    @InjectRepository(Clue) private readonly clueRepo: Repository<Clue>,
    @InjectRepository(Opportunity) private readonly oppRepo: Repository<Opportunity>,
    @InjectRepository(OnlineChannelDaily)
    private readonly onlineDailyRepo: Repository<OnlineChannelDaily>,
    @InjectRepository(OnlineChannel) private readonly onlineChannelRepo: Repository<OnlineChannel>,
    @Inject(DataScopeService) private readonly dataScopeService: DataScopeService,
    @Inject(AiService) private readonly aiService: AiService
  ) {}

  @UseGuards(JwtGuard)
  @Get('sales-funnel')
  async salesFunnel(@Req() req: any, @Query() query: any) {
    try {
      const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
      const allow = new Set(['R_ADMIN', 'R_SUPER'])
      const hasRole = roles.some((r) => allow.has(String(r)))
      if (!hasRole) {
        return { code: 403, msg: '仅管理员或超级管理员可查看销售转化分析', data: { items: [] } }
      }
      const scope = await this.dataScopeService.getScope(req.user)
      const storeId = Number(query.storeId || 0)
      const allowed = await this.dataScopeService.resolveAllowedStoreIds(scope)
      const now = new Date()
      const pad2 = (n: number) => `${n}`.padStart(2, '0')
      const fmt = (d: Date) => {
        const t = d?.getTime?.()
        if (typeof t !== 'number' || Number.isNaN(t)) {
          const x = new Date()
          return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`
        }
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
      }
      const period: string = String(query.period || 'month')
      let start = String(query.start || '')
      let end = String(query.end || '')
      const qL1 = String(query.channelLevel1 || '').trim()
      const qL2 = String(query.channelLevel2 || '').trim()
      const explicitOnline = String(query.channelCategory || '').trim() === '线上'
      const isOnline = explicitOnline
      const l1Set = (() => {
        const s = new Set<string>()
        if (!isOnline) return []
        if (!qL1) {
          s.add('品牌')
          s.add('垂媒')
          s.add('新媒体')
          s.add('新媒体开发')
        } else if (qL1 === '新媒体' || qL1 === '新媒体开发') {
          s.add('新媒体')
          s.add('新媒体开发')
        } else {
          s.add(qL1)
        }
        return Array.from(s)
      })()
      const l1Arr = l1Set.map((v) => String(v).trim().toLowerCase())
      const l1Daily = (() => {
        if (!isOnline) return []
        if (!qL1) return ['品牌', '垂媒', '新媒体']
        if (qL1 === '新媒体' || qL1 === '新媒体开发') return ['新媒体']
        if (qL1 === '垂媒') return ['垂媒']
        if (qL1 === '品牌') return ['品牌']
        return [qL1]
      })()
      const l1DailyLower = l1Daily.map((v) => String(v).trim().toLowerCase())

      if (period === 'month' && String(query.month || '').length >= 7) {
        const m = String(query.month)
        const [yy, mm] = m.split('-')
        const y = Number(yy)
        const mmNum = Number(mm)
        if (Number.isFinite(y) && Number.isFinite(mmNum) && mmNum >= 1 && mmNum <= 12) {
          const monthIdx = mmNum - 1
          const d1 = new Date(y, monthIdx, 1)
          const d2 = new Date(y, monthIdx + 1, 0)
          start = fmt(d1)
          end = fmt(d2)
        }
      } else if (period === 'year' && String(query.year || '').length >= 4) {
        const y = Number(String(query.year))
        if (Number.isFinite(y) && y >= 1970 && y <= 3000) {
          const d1 = new Date(y, 0, 1)
          const d2 = new Date(y, 11, 31)
          start = fmt(d1)
          end = fmt(d2)
        }
      } else if (period === 'week' && String(query.week || '').length >= 8) {
        const w = String(query.week)
        let base: Date
        if (/^\d{4}-\d{2}-\d{2}$/.test(w)) base = new Date(`${w}T00:00:00`)
        else base = now
        const day = base.getDay()
        const diffToMonday = (day + 6) % 7
        const monday = new Date(base)
        monday.setDate(base.getDate() - diffToMonday)
        monday.setHours(0, 0, 0, 0)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        sunday.setHours(23, 59, 59, 999)
        start = fmt(monday)
        end = fmt(sunday)
      }

      if (!start || !end) {
        if (period === 'day') {
          const s = fmt(now)
          start = s
          end = s
        } else if (period === 'week') {
          const day = now.getDay()
          const diffToMonday = (day + 6) % 7
          const monday = new Date(now)
          monday.setDate(now.getDate() - diffToMonday)
          monday.setHours(0, 0, 0, 0)
          const sunday = new Date(monday)
          sunday.setDate(monday.getDate() + 6)
          sunday.setHours(23, 59, 59, 999)
          start = fmt(monday)
          end = fmt(sunday)
        } else if (period === 'year') {
          const d1 = new Date(now.getFullYear(), 0, 1)
          const d2 = new Date(now.getFullYear(), 11, 31)
          start = fmt(d1)
          end = fmt(d2)
        } else {
          const d1 = new Date(now.getFullYear(), now.getMonth(), 1)
          const d2 = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          start = fmt(d1)
          end = fmt(d2)
        }
      }
      const qbOpp = this.oppRepo.createQueryBuilder('o')
      qbOpp.where('1=1')
      const l2Lower = String(qL2 || '')
        .trim()
        .toLowerCase()
      if (isOnline) {
        qbOpp.andWhere('o.channelCategory = :online', { online: '线上' })
        if (l1Arr.length) qbOpp.andWhere('LOWER(TRIM(o.channelLevel1)) IN (:...l1)', { l1: l1Arr })
        if (qL2) qbOpp.andWhere('LOWER(TRIM(o.channelLevel2)) = :l2', { l2: l2Lower })
      }

      if (storeId) {
        if (scope.level !== 'all') {
          let isAllowed = allowed.length ? allowed.includes(storeId) : false
          if (!isAllowed && scope.level === 'self' && typeof scope.employeeId === 'number') {
            const selfIds = await this.dataScopeService.getStoreIdsForEmployee(scope.employeeId)
            isAllowed = selfIds.includes(storeId)
          }
          if (!isAllowed) {
            return { code: 403, msg: '无权访问该门店', data: { items: [] } }
          }
        }
        qbOpp.andWhere('o.storeId = :storeId', { storeId })
      } else if (allowed.length) {
        qbOpp.andWhere('o.storeId IN (:...storeIds)', { storeIds: allowed })
      }
      qbOpp.andWhere(
        '(o.latestVisitDate BETWEEN :start1 AND :end1) OR (o.openDate BETWEEN :start2 AND :end2)',
        {
          start1: String(start),
          end1: String(end),
          start2: String(start),
          end2: String(end)
        }
      )
      let opps = await qbOpp.getMany()
      const storesToQuery = storeId ? [storeId] : allowed.length ? allowed : []

      const qbClue = this.clueRepo.createQueryBuilder('c')
      qbClue.where('1=1')
      if (storesToQuery.length)
        qbClue.andWhere('c.storeId IN (:...stores)', { stores: storesToQuery })
      qbClue.andWhere('c.visitDate BETWEEN :start AND :end', {
        start: String(start),
        end: String(end)
      })
      if (isOnline) {
        qbClue.andWhere('c.channelCategory = :online', { online: '线上' })
        if (l1Arr.length) qbClue.andWhere('LOWER(TRIM(c.channelLevel1)) IN (:...l1)', { l1: l1Arr })
        if (qL2) qbClue.andWhere('LOWER(TRIM(c.channelLevel2)) = :l2', { l2: l2Lower })
      }
      const clues = await qbClue.getMany()

      let totalOrders = opps.length
      if (isOnline) {
        const cluePhonesSet = new Set(clues.map((c) => String(c.customerPhone || '')))
        opps = opps.filter((o) => cluePhonesSet.has(String(o.customerPhone || '')))
        totalOrders = opps.length
      }

      let leadCount = 0
      if (isOnline) {
        if (storesToQuery.length) {
          const qbDaily = this.onlineDailyRepo.createQueryBuilder('d')
          qbDaily.where('d.storeId IN (:...stores)', { stores: storesToQuery })
          qbDaily.andWhere('d.date BETWEEN :start AND :end', {
            start: String(start),
            end: String(end)
          })
          qbDaily.andWhere('LOWER(TRIM(d.level1)) IN (:...levels)', { levels: l1DailyLower })
          if (qL2) qbDaily.andWhere('LOWER(TRIM(d.level2)) = :l2', { l2: l2Lower })
          const rows = await qbDaily.getMany()
          leadCount = rows.reduce((sum, r) => sum + Math.max(0, Number(r.count || 0)), 0)
          totalOrders = Math.min(totalOrders, leadCount)
        }
      } else {
        // 非线上口径：线索基数按去重手机号计数
        const phoneSet = new Set(clues.map((c) => String(c.customerPhone || '')))
        leadCount = Array.from(phoneSet).filter((p) => !!p).length
      }

      const byKey = new Map<string, Clue[]>()
      clues.forEach((c) => {
        const key = `${c.storeId}|${String(c.customerPhone || '')}`
        const arr = byKey.get(key) || []
        arr.push(c)
        byKey.set(key, arr)
      })
      const oppsByKey = new Map<string, Opportunity[]>()
      opps.forEach((o) => {
        const key = `${o.storeId}|${String(o.customerPhone || '')}`
        const arr = oppsByKey.get(key) || []
        arr.push(o)
        oppsByKey.set(key, arr)
      })

      const parseDate = (s: string) => {
        try {
          const d = new Date(`${String(s || '').trim()}T00:00:00`)
          if (Number.isNaN(d.getTime())) return null
          return d
        } catch {
          return null
        }
      }

      let firstVisitCount = 0
      let firstTestDriveCount = 0
      let firstDealCount = 0
      let againVisitCount = 0
      let againTestDriveCount = 0
      let againDealCount = 0

      for (const [key, oppListRaw] of oppsByKey.entries()) {
        const list = (byKey.get(key) || []).slice().sort((a, b) => {
          const da = parseDate(a.visitDate)?.getTime() || 0
          const db = parseDate(b.visitDate)?.getTime() || 0
          return da - db
        })
        const oppList = oppListRaw.slice().sort((a, b) => {
          const da = parseDate(a.openDate)?.getTime() || 0
          const db = parseDate(b.openDate)?.getTime() || 0
          return da - db
        })
        for (let i = 0; i < oppList.length; i++) {
          const o = oppList[i]
          const startD = parseDate(o.openDate)
          const endD = i + 1 < oppList.length ? parseDate(oppList[i + 1].openDate || '') : null
          const assigned = list.filter((c) => {
            const dc = parseDate(c.visitDate)
            if (!dc) return false
            if (startD && dc.getTime() < startD.getTime()) return false
            if (endD && dc.getTime() >= endD.getTime()) return false
            return true
          })
          if (assigned.length) {
            firstVisitCount += 1
            const first = assigned[0]
            if (first?.testDrive) firstTestDriveCount += 1
            if (first?.dealDone) firstDealCount += 1
            const rest = assigned.slice(1)
            if (rest.length) againVisitCount += 1
            if (rest.some((r) => !!r.testDrive)) againTestDriveCount += 1
            if (rest.some((r) => !!r.dealDone)) againDealCount += 1
          }
        }
      }
      const combinedDealsRaw = opps.filter((o) => String(o.status) === '已成交').length
      const combinedTestDrivesRaw =
        Math.max(0, Number(firstTestDriveCount || 0)) +
        Math.max(0, Number(againTestDriveCount || 0))

      // 统一上限：不超过“全部商机数量”
      firstVisitCount = Math.min(firstVisitCount, totalOrders)
      firstTestDriveCount = Math.min(firstTestDriveCount, firstVisitCount)
      firstDealCount = Math.min(firstDealCount, firstVisitCount)
      againVisitCount = Math.min(againVisitCount, totalOrders)
      againTestDriveCount = Math.min(againTestDriveCount, againVisitCount)
      againDealCount = Math.min(againDealCount, againVisitCount)
      const combinedDeals = Math.min(combinedDealsRaw, totalOrders)
      const combinedTestDrives = Math.min(combinedTestDrivesRaw, totalOrders)

      const items = [
        { stage: '全部线索数量', value: leadCount },
        { stage: '全部商机数量', value: totalOrders },
        { stage: '首次到店', value: firstVisitCount },
        { stage: '首次试驾', value: firstTestDriveCount },
        { stage: '首次成交', value: firstDealCount },
        { stage: '再次到店/接触（上门）', value: againVisitCount },
        { stage: '再次试驾', value: againTestDriveCount },
        { stage: '再次成交', value: againDealCount },
        { stage: '综合试驾', value: combinedTestDrives },
        { stage: '综合成交', value: combinedDeals },
        { stage: '线索转化率', value: combinedDeals }
      ]
      const valueMap: Record<string, number> = items.reduce(
        (acc, it) => {
          acc[it.stage] = Math.max(0, Number((it as any).value || 0))
          return acc
        },
        {} as Record<string, number>
      )

      const baseStageMap: Record<string, string | undefined> = {
        全部线索数量: undefined,
        全部商机数量: '全部线索数量',
        首次到店: '全部商机数量',
        首次试驾: '首次到店',
        首次成交: '首次到店',
        '再次到店/接触（上门）': '全部商机数量',
        再次试驾: '再次到店/接触（上门）',
        再次成交: '再次到店/接触（上门）',
        综合试驾: '全部商机数量',
        综合成交: '全部商机数量',
        线索转化率: '全部线索数量'
      }

      const itemsWithPercent = items.map((it) => {
        const v = Math.max(0, Number((it as any).value || 0))
        const baseStage = baseStageMap[it.stage]
        const baseVal = baseStage ? Math.max(0, Number(valueMap[baseStage] || 0)) : v
        let pctRaw = 0
        if (!baseStage) {
          // 自身为基数行：有值则为100，否则0
          pctRaw = v > 0 ? 100 : 0
        } else {
          pctRaw = baseVal > 0 ? Math.round((v / baseVal) * 100) : 0
        }
        const pct = Math.max(0, Math.min(100, pctRaw))
        return { ...it, percent: pct, percentRaw: pctRaw, mom: 0 }
      })
      return { code: 200, msg: 'ok', data: { items: itemsWithPercent } }
    } catch (e: any) {
      try {
        console.error('[bi.sales-funnel.error]', e?.message || e, e?.stack)
      } catch (err) {
        void err
      }
      return { code: 200, msg: 'ok', data: { items: [] } }
    }
  }

  @UseGuards(JwtGuard)
  @Get('sales-funnel-insight')
  async salesFunnelInsight(@Req() req: any, @Query() query: any) {
    const base = await this.salesFunnel(req, query)
    const items = Array.isArray((base as any)?.data?.items) ? (base as any).data.items : []
    const insight = await this.aiService.generateSalesFunnelInsight(items, query || {})
    return { code: 200, msg: 'ok', data: { insight } }
  }

  @UseGuards(JwtGuard)
  @Get('store-clue-portrait')
  async storeCluePortrait(@Req() req: any, @Query() query: any) {
    try {
      const scope = await this.dataScopeService.getScope(req.user)
      const storeId = Number(query.storeId || 0)
      const allowed = await this.dataScopeService.resolveAllowedStoreIds(scope)

      if (storeId) {
        if (scope.level !== 'all') {
          let isAllowed = allowed.length ? allowed.includes(storeId) : false
          if (!isAllowed && scope.level === 'self' && typeof scope.employeeId === 'number') {
            const selfIds = await this.dataScopeService.getStoreIdsForEmployee(scope.employeeId)
            isAllowed = selfIds.includes(storeId)
          }
          if (!isAllowed) {
            return {
              code: 403,
              msg: '无权访问该门店',
              data: { total: 0, avgAge: null, gender: [], buyExperience: [], visitCategory: [] }
            }
          }
        }
      }

      const now = new Date()
      const pad2 = (n: number) => `${n}`.padStart(2, '0')
      const fmt = (d: Date) => {
        const t = d?.getTime?.()
        if (typeof t !== 'number' || Number.isNaN(t)) {
          const x = new Date()
          return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`
        }
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
      }

      const period: string = String(query.period || 'month')
      let start = String(query.start || '')
      let end = String(query.end || '')

      if (period === 'month' && String(query.month || '').length >= 7) {
        const m = String(query.month)
        const [yy, mm] = m.split('-')
        const y = Number(yy)
        const mmNum = Number(mm)
        if (Number.isFinite(y) && Number.isFinite(mmNum) && mmNum >= 1 && mmNum <= 12) {
          const monthIdx = mmNum - 1
          start = fmt(new Date(y, monthIdx, 1))
          end = fmt(new Date(y, monthIdx + 1, 0))
        }
      } else if (period === 'year' && String(query.year || '').length >= 4) {
        const y = Number(String(query.year))
        if (Number.isFinite(y) && y >= 1970 && y <= 3000) {
          start = fmt(new Date(y, 0, 1))
          end = fmt(new Date(y, 11, 31))
        }
      } else if (period === 'week' && String(query.week || '').length >= 8) {
        const w = String(query.week)
        let base: Date
        if (/^\d{4}-\d{2}-\d{2}$/.test(w)) base = new Date(`${w}T00:00:00`)
        else base = now
        const day = base.getDay()
        const diffToMonday = (day + 6) % 7
        const monday = new Date(base)
        monday.setDate(base.getDate() - diffToMonday)
        monday.setHours(0, 0, 0, 0)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        sunday.setHours(23, 59, 59, 999)
        start = fmt(monday)
        end = fmt(sunday)
      }

      if (!start || !end) {
        if (period === 'day') {
          const s = fmt(now)
          start = s
          end = s
        } else if (period === 'week') {
          const day = now.getDay()
          const diffToMonday = (day + 6) % 7
          const monday = new Date(now)
          monday.setDate(now.getDate() - diffToMonday)
          monday.setHours(0, 0, 0, 0)
          const sunday = new Date(monday)
          sunday.setDate(monday.getDate() + 6)
          sunday.setHours(23, 59, 59, 999)
          start = fmt(monday)
          end = fmt(sunday)
        } else if (period === 'year') {
          start = fmt(new Date(now.getFullYear(), 0, 1))
          end = fmt(new Date(now.getFullYear(), 11, 31))
        } else {
          start = fmt(new Date(now.getFullYear(), now.getMonth(), 1))
          end = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0))
        }
      }

      const focusModelId = Number(query.focusModelId || 0)
      const dealStatus = String(query.dealStatus || 'all')
        .trim()
        .toLowerCase()
      let storesToQuery: number[] = []
      if (storeId) {
        storesToQuery = [storeId]
      } else if (scope.level === 'all') {
        storesToQuery = []
      } else if (allowed.length) {
        storesToQuery = allowed
      } else if (scope.level === 'self' && typeof scope.employeeId === 'number') {
        storesToQuery = await this.dataScopeService.getStoreIdsForEmployee(scope.employeeId)
      } else {
        storesToQuery = []
      }

      if (scope.level !== 'all' && storesToQuery.length === 0) {
        return {
          code: 403,
          msg: '无可访问门店',
          data: { total: 0, avgAge: null, gender: [], buyExperience: [], visitCategory: [] }
        }
      }

      const qbClue = this.clueRepo.createQueryBuilder('c')
      qbClue.where('c.visitDate BETWEEN :start AND :end', {
        start: String(start),
        end: String(end)
      })
      if (storesToQuery.length)
        qbClue.andWhere('c.storeId IN (:...stores)', { stores: storesToQuery })
      if (Number.isFinite(focusModelId) && focusModelId > 0)
        qbClue.andWhere('c.focusModelId = :mid', { mid: focusModelId })
      const cluesRaw = await qbClue.getMany()

      const keyOf = (c: Clue): string => {
        const cid = Number((c as any).customerId || 0)
        if (Number.isFinite(cid) && cid > 0) return `cid:${cid}`
        const sid = Number((c as any).storeId || 0)
        const phone = String((c as any).customerPhone || '').trim()
        return `phone:${sid}|${phone}`
      }

      const perCustomer = new Map<string, Clue>()
      for (const c of cluesRaw) {
        const k = keyOf(c)
        if (k.endsWith('|') || k === 'phone:0|' || k === 'phone:|') continue
        const exist = perCustomer.get(k)
        if (!exist) {
          perCustomer.set(k, c)
          continue
        }
        const a = String((exist as any).visitDate || '')
        const b = String((c as any).visitDate || '')
        if (b > a) perCustomer.set(k, c)
      }

      const baseKeys = Array.from(perCustomer.keys())
      if (dealStatus === 'done' || dealStatus === 'undone') {
        const customerIds: number[] = []
        const phones: string[] = []
        for (const k of baseKeys) {
          if (k.startsWith('cid:')) {
            const id = Number(k.slice('cid:'.length))
            if (Number.isFinite(id) && id > 0) customerIds.push(id)
          } else if (k.startsWith('phone:')) {
            const rest = k.slice('phone:'.length)
            const idx = rest.indexOf('|')
            if (idx >= 0) {
              const phone = rest.slice(idx + 1).trim()
              if (phone) phones.push(phone)
            }
          }
        }

        const sold = new Set<string>()
        const chunk = <T>(arr: T[], size: number) => {
          const out: T[][] = []
          for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
          return out
        }

        for (const ids of chunk(Array.from(new Set(customerIds)), 800)) {
          const qb = this.oppRepo.createQueryBuilder('o')
          qb.select(['o.customerId'])
          qb.where('o.status = :st', { st: '已成交' })
          qb.andWhere('o.customerId IN (:...ids)', { ids })
          if (storesToQuery.length)
            qb.andWhere('o.storeId IN (:...stores)', { stores: storesToQuery })
          const rows = await qb.getMany()
          rows.forEach((o) => {
            const cid = Number((o as any).customerId || 0)
            if (Number.isFinite(cid) && cid > 0) sold.add(`cid:${cid}`)
          })
        }

        for (const ps of chunk(Array.from(new Set(phones)), 800)) {
          const qb = this.oppRepo.createQueryBuilder('o')
          qb.select(['o.storeId', 'o.customerPhone'])
          qb.where('o.status = :st', { st: '已成交' })
          qb.andWhere('o.customerPhone IN (:...ps)', { ps })
          if (storesToQuery.length)
            qb.andWhere('o.storeId IN (:...stores)', { stores: storesToQuery })
          const rows = await qb.getMany()
          rows.forEach((o) => {
            const sid = Number((o as any).storeId || 0)
            const phone = String((o as any).customerPhone || '').trim()
            if (sid > 0 && phone) sold.add(`phone:${sid}|${phone}`)
          })
        }

        for (const k of baseKeys) {
          const isSold = sold.has(k)
          if (dealStatus === 'done' && !isSold) perCustomer.delete(k)
          if (dealStatus === 'undone' && isSold) perCustomer.delete(k)
        }
      }

      const customers = Array.from(perCustomer.values())

      let avgAge: number | null = null
      let avgCarAge: number | null = null
      let avgMileage: number | null = null

      if (customers.length > 0) {
        let sumAge = 0
        let cntAge = 0
        let sumCarAge = 0
        let cntCarAge = 0
        let sumMileage = 0
        let cntMileage = 0

        for (const c of customers) {
          const age = Number((c as any).userAge || 0)
          if (age > 0) {
            sumAge += age
            cntAge++
          }
          const ca = Number((c as any).carAge || 0)
          if (ca > 0) {
            sumCarAge += ca
            cntCarAge++
          }
          const m = Number((c as any).mileage || 0)
          if (m > 0) {
            sumMileage += m
            cntMileage++
          }
        }
        if (cntAge > 0) avgAge = Math.round((sumAge / cntAge) * 10) / 10
        if (cntCarAge > 0) avgCarAge = Math.round((sumCarAge / cntCarAge) * 10) / 10
        if (cntMileage > 0) avgMileage = Math.round((sumMileage / cntMileage) * 10) / 10
      }

      const countBy = (getter: (c: Clue) => string) => {
        const m = new Map<string, number>()
        for (const c of customers) {
          const k = String(getter(c) || '').trim() || '未知'
          m.set(k, (m.get(k) || 0) + 1)
        }
        return Array.from(m.entries()).map(([name, value]) => ({ name, value }))
      }

      // 战败原因统计
      // Channel Stats
      // 修正：集客类型（businessSource）与集客渠道（channelLevel1）
      const sourceStats = new Map<string, number>() // 集客渠道 (Channel Level 1)
      const typeStats = new Map<string, number>() // 集客类型 (Business Source)

      for (const c of customers) {
        // 集客渠道：取 channelLevel1
        const src = String((c as any).channelLevel1 || '未知').trim()
        sourceStats.set(src, (sourceStats.get(src) || 0) + 1)

        // 集客类型：取 businessSource
        const typeName = String(c.businessSource || '未知').trim()
        typeStats.set(typeName, (typeStats.get(typeName) || 0) + 1)
      }

      const channelSource = Array.from(sourceStats.entries()).map(([name, value]) => ({
        name,
        value
      }))
      const channelType = Array.from(typeStats.entries()).map(([name, value]) => ({
        name,
        value
      }))

      // Fail Reason Stats
      const failReasonStats = new Map<string, number>()
      if (customers.length > 0) {
        const customerIds: number[] = []
        const phonesByStore = new Map<number, string[]>()

        for (const c of customers) {
          const cid = Number((c as any).customerId || 0)
          if (Number.isFinite(cid) && cid > 0) {
            customerIds.push(cid)
          } else {
            const sid = Number((c as any).storeId || 0)
            const p = String((c as any).customerPhone || '').trim()
            if (sid > 0 && p) {
              const list = phonesByStore.get(sid) || []
              list.push(p)
              phonesByStore.set(sid, list)
            }
          }
        }

        const chunk = <T>(arr: T[], size: number) => {
          const out: T[][] = []
          for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
          return out
        }

        // 1. By CustomerID
        const uniqueCids = Array.from(new Set(customerIds))
        if (uniqueCids.length > 0) {
          for (const ids of chunk(uniqueCids, 500)) {
            const qb = this.oppRepo.createQueryBuilder('o')
            qb.select(['o.failReason'])
            qb.where('o.status = :st', { st: '已战败' })
            qb.andWhere('o.customerId IN (:...ids)', { ids })
            if (storesToQuery.length)
              qb.andWhere('o.storeId IN (:...stores)', { stores: storesToQuery })
            const rows = await qb.getMany()
            for (const r of rows) {
              const reason = String(r.failReason || '').trim() || '其他'
              failReasonStats.set(reason, (failReasonStats.get(reason) || 0) + 1)
            }
          }
        }

        // 2. By Phone (grouped by store)
        for (const [sid, psRaw] of phonesByStore) {
          const ps = Array.from(new Set(psRaw))
          for (const batch of chunk(ps, 500)) {
            const qb = this.oppRepo.createQueryBuilder('o')
            qb.select(['o.failReason'])
            qb.where('o.status = :st', { st: '已战败' })
            qb.andWhere('o.storeId = :sid', { sid })
            qb.andWhere('o.customerPhone IN (:...ps)', { ps: batch })
            const rows = await qb.getMany()
            for (const r of rows) {
              const reason = String(r.failReason || '').trim() || '其他'
              failReasonStats.set(reason, (failReasonStats.get(reason) || 0) + 1)
            }
          }
        }
      }

      const failReason = Array.from(failReasonStats.entries()).map(([name, value]) => ({
        name,
        value
      }))

      return {
        code: 200,
        msg: 'ok',
        data: {
          total: customers.length,
          avgAge,
          avgCarAge,
          avgMileage,
          gender: countBy((c) => String((c as any).userGender || '未知')),
          buyExperience: countBy((c) => String((c as any).buyExperience || '未知')),
          visitCategory: countBy((c) => String((c as any).visitCategory || '未知')),
          channelType,
          channelSource,
          failReason
        }
      }
    } catch (e: any) {
      try {
        console.error('[bi.store-clue-portrait.error]', e?.message || e, e?.stack)
      } catch (err) {
        void err
      }
      return {
        code: 200,
        msg: 'ok',
        data: { total: 0, avgAge: null, gender: [], buyExperience: [], visitCategory: [] }
      }
    }
  }

  @Get('sales-funnel/open')
  async salesFunnelOpen(@Query() query: any) {
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
    if (isProd || process.env.SEED_ENABLED !== 'true') {
      return { code: 403, msg: '生产环境不开放销售转化分析接口', data: { items: [] } }
    }
    const reqMock: any = { user: { roles: ['R_SUPER'] } }
    return await this.salesFunnel(reqMock, { ...query })
  }
}
