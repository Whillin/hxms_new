import { Controller, Get, Query, Req, UseGuards, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtGuard } from '../auth/jwt.guard'
import { Clue } from '../clues/clue.entity'
import { Opportunity } from '../opportunities/opportunity.entity'
import { DataScopeService } from '../common/data-scope.service'
import { OnlineChannelDaily } from '../channels/online-channel-daily.entity'
import { OnlineChannel } from '../channels/online-channel.entity'

@Controller('api/bi')
export class BiController {
  constructor(
    @InjectRepository(Clue) private readonly clueRepo: Repository<Clue>,
    @InjectRepository(Opportunity) private readonly oppRepo: Repository<Opportunity>,
    @InjectRepository(OnlineChannelDaily)
    private readonly onlineDailyRepo: Repository<OnlineChannelDaily>,
    @InjectRepository(OnlineChannel) private readonly onlineChannelRepo: Repository<OnlineChannel>,
    @Inject(DataScopeService) private readonly dataScopeService: DataScopeService
  ) {}

  @UseGuards(JwtGuard)
  @Get('sales-funnel')
  async salesFunnel(@Req() req: any, @Query() query: any) {
    try {
      const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
      const allow = new Set(['R_ADMIN', 'R_SUPER'])
      const hasRole = roles.some((r) => allow.has(String(r)))
      if (!hasRole) {
        return { code: 403, msg: '仅管理员或超级管理员可查看BI分析', data: { items: [] } }
      }
      const scope = await this.dataScopeService.getScope(req.user)
      const storeId = Number(query.storeId || 0)
      const modelId = Number(query.modelId || 0)
      const allowed = await this.dataScopeService.resolveAllowedStoreIds(scope)
      const now = new Date()
      const fmt = (d: Date) => {
        const t = d?.getTime?.()
        if (typeof t !== 'number' || Number.isNaN(t)) {
          return new Date().toISOString().slice(0, 10)
        }
        return d.toISOString().slice(0, 10)
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

      let storesToQuery = storeId ? [storeId] : allowed.length ? allowed : []
      if (!storeId && (!storesToQuery || storesToQuery.length === 0)) {
        try {
          const allIds = await this.dataScopeService.resolveAllowedStoreIds({ level: 'all' })
          if (Array.isArray(allIds) && allIds.length) storesToQuery = allIds
        } catch (err) {
          void err
        }
      }
      if (!storeId && storesToQuery.length) {
        try {
          console.log('[bi.sales-funnel] aggregated-total stores:', storesToQuery)
        } catch {}
        const computeForStore = async (sid: number) => {
          const qbOpp1 = this.oppRepo.createQueryBuilder('o')
          qbOpp1.where('1=1')
          if (isOnline) {
            qbOpp1.andWhere('o.channelCategory = :online', { online: '线上' })
            if (l1Arr.length)
              qbOpp1.andWhere('LOWER(TRIM(o.channelLevel1)) IN (:...l1)', { l1: l1Arr })
            if (qL2) qbOpp1.andWhere('LOWER(TRIM(o.channelLevel2)) = :l2', { l2: l2Lower })
          }
          qbOpp1.andWhere('o.storeId = :sid', { sid })
          if (Number.isFinite(modelId) && modelId > 0)
            qbOpp1.andWhere('o.focusModelId = :mid', { mid: modelId })
          qbOpp1.andWhere('o.latestVisitDate BETWEEN :start AND :end', {
            start: String(start),
            end: String(end)
          })
          let opps1 = await qbOpp1.getMany()

          const qbClue1 = this.clueRepo.createQueryBuilder('c')
          qbClue1.where('1=1')
          qbClue1.andWhere('c.storeId = :sid', { sid })
          qbClue1.andWhere('c.visitDate BETWEEN :start AND :end', {
            start: String(start),
            end: String(end)
          })
          if (Number.isFinite(modelId) && modelId > 0)
            qbClue1.andWhere('(c.focusModelId = :mid OR c.dealModelId = :mid)', { mid: modelId })
          if (isOnline) {
            qbClue1.andWhere('c.channelCategory = :online', { online: '线上' })
            if (l1Arr.length)
              qbClue1.andWhere('LOWER(TRIM(c.channelLevel1)) IN (:...l1)', { l1: l1Arr })
            if (qL2) qbClue1.andWhere('LOWER(TRIM(c.channelLevel2)) = :l2', { l2: l2Lower })
          }
          const clues1 = await qbClue1.getMany()

          let total1 = opps1.length
          if (Number.isFinite(modelId) && modelId > 0) {
            const cluePhonesSetForModel = new Set(clues1.map((c) => String(c.customerPhone || '')))
            opps1 = opps1.filter((o) => cluePhonesSetForModel.has(String(o.customerPhone || '')))
            total1 = opps1.length
          }
          if (isOnline) {
            const qbDaily1 = this.onlineDailyRepo.createQueryBuilder('d')
            qbDaily1.where('d.storeId = :sid', { sid })
            qbDaily1.andWhere('d.date BETWEEN :start AND :end', {
              start: String(start),
              end: String(end)
            })
            qbDaily1.andWhere('LOWER(TRIM(d.level1)) IN (:...levels)', { levels: l1DailyLower })
            if (qL2) qbDaily1.andWhere('LOWER(TRIM(d.level2)) = :l2', { l2: l2Lower })
            const rows1 = await qbDaily1.getMany()
            const lead1 = rows1.reduce((sum, r) => sum + Math.max(0, Number(r.count || 0)), 0)
            total1 = Math.min(total1, lead1)
            return {
              lead: lead1,
              total: total1,
              firstVisit: 0,
              firstDrive: 0,
              firstDeal: 0,
              againVisit: 0,
              againDrive: 0,
              againDeal: 0,
              combinedDrive: 0,
              combinedDeal: opps1.filter((o) => String(o.status) === '已成交').length
            }
          }

          const byKey1 = new Map<string, Clue[]>()
          clues1.forEach((c) => {
            const key = `${sid}|${String(c.customerPhone || '')}`
            const arr = byKey1.get(key) || []
            arr.push(c)
            byKey1.set(key, arr)
          })
          const oppsByKey1 = new Map<string, Opportunity[]>()
          opps1.forEach((o) => {
            const key = `${sid}|${String(o.customerPhone || '')}`
            const arr = oppsByKey1.get(key) || []
            arr.push(o)
            oppsByKey1.set(key, arr)
          })
          const parseDate1 = (s: string) => {
            try {
              const d = new Date(`${String(s || '').trim()}T00:00:00`)
              if (Number.isNaN(d.getTime())) return null
              return d
            } catch {
              return null
            }
          }
          let firstVisit = 0
          let firstDrive = 0
          let firstDeal = 0
          let againVisit = 0
          let againDrive = 0
          let againDeal = 0
          for (const [key, oppListRaw] of oppsByKey1.entries()) {
            const list = (byKey1.get(key) || []).slice().sort((a, b) => {
              const da = parseDate1(a.visitDate)?.getTime() || 0
              const db = parseDate1(b.visitDate)?.getTime() || 0
              return da - db
            })
            const oppList = oppListRaw.slice().sort((a, b) => {
              const da = parseDate1(a.openDate)?.getTime() || 0
              const db = parseDate1(b.openDate)?.getTime() || 0
              return da - db
            })
            for (let i = 0; i < oppList.length; i++) {
              const o = oppList[i]
              const startD = parseDate1(o.openDate)
              const endD = i + 1 < oppList.length ? parseDate1(oppList[i + 1].openDate || '') : null
              const assigned = list.filter((c) => {
                const dc = parseDate1(c.visitDate)
                if (!dc) return false
                if (startD && dc.getTime() < startD.getTime()) return false
                if (endD && dc.getTime() >= endD.getTime()) return false
                return true
              })
              if (assigned.length) {
                firstVisit += 1
                const first = assigned[0]
                if (first?.testDrive) firstDrive += 1
                if (first?.dealDone) firstDeal += 1
                const rest = assigned.slice(1)
                if (rest.length) againVisit += 1
                if (rest.some((r) => !!r.testDrive)) againDrive += 1
                if (rest.some((r) => !!r.dealDone)) againDeal += 1
              }
            }
          }
          const combinedDealsRaw1 = opps1.filter((o) => String(o.status) === '已成交').length
          const combinedDrivesRaw1 = Math.max(0, Number(firstDrive || 0)) + Math.max(0, Number(againDrive || 0))
          firstVisit = Math.min(firstVisit, total1)
          firstDrive = Math.min(firstDrive, firstVisit)
          firstDeal = Math.min(firstDeal, firstVisit)
          againVisit = Math.min(againVisit, total1)
          againDrive = Math.min(againDrive, againVisit)
          againDeal = Math.min(againDeal, againVisit)
          const combinedDeal1 = Math.min(combinedDealsRaw1, total1)
          const combinedDrive1 = Math.min(combinedDrivesRaw1, total1)
          const phoneSet1 = new Set(clues1.map((c) => String(c.customerPhone || '')))
          const lead1 = Array.from(phoneSet1).filter((p) => !!p).length
          return {
            lead: lead1,
            total: total1,
            firstVisit,
            firstDrive,
            firstDeal,
            againVisit,
            againDrive,
            againDeal,
            combinedDrive: combinedDrive1,
            combinedDeal: combinedDeal1
          }
        }

        const sum = {
          lead: 0,
          total: 0,
          firstVisit: 0,
          firstDrive: 0,
          firstDeal: 0,
          againVisit: 0,
          againDrive: 0,
          againDeal: 0,
          combinedDrive: 0,
          combinedDeal: 0
        }
        for (const sid of storesToQuery) {
          const r = await computeForStore(sid)
          sum.lead += r.lead
          sum.total += r.total
          sum.firstVisit += r.firstVisit
          sum.firstDrive += r.firstDrive
          sum.firstDeal += r.firstDeal
          sum.againVisit += r.againVisit
          sum.againDrive += r.againDrive
          sum.againDeal += r.againDeal
          sum.combinedDrive += r.combinedDrive
          sum.combinedDeal += r.combinedDeal
        }
        // 统一总计：使用一次性 IN 查询校准“商机总数/综合成交”
        const qbOppU = this.oppRepo.createQueryBuilder('o')
        qbOppU.where('1=1')
        if (isOnline) {
          qbOppU.andWhere('o.channelCategory = :online', { online: '线上' })
          if (l1Arr.length) qbOppU.andWhere('LOWER(TRIM(o.channelLevel1)) IN (:...l1)', { l1: l1Arr })
          if (qL2) qbOppU.andWhere('LOWER(TRIM(o.channelLevel2)) = :l2', { l2: l2Lower })
        }
        qbOppU.andWhere('o.storeId IN (:...stores)', { stores: storesToQuery })
        if (Number.isFinite(modelId) && modelId > 0) qbOppU.andWhere('o.focusModelId = :mid', { mid: modelId })
        qbOppU.andWhere('o.latestVisitDate BETWEEN :start AND :end', {
          start: String(start),
          end: String(end)
        })
        const oppsUnified = await qbOppU.getMany()
        const unifiedTotal = oppsUnified.length
        const unifiedCombinedDeal = oppsUnified.filter((o) => String(o.status) === '已成交').length

        const itemsAgg = [
          { stage: '全部线索数量', value: sum.lead },
          { stage: '全部商机数量', value: unifiedTotal },
          { stage: '首次到店', value: sum.firstVisit },
          { stage: '首次试驾', value: sum.firstDrive },
          { stage: '首次成交', value: sum.firstDeal },
          { stage: '再次到店/接触（上门）', value: sum.againVisit },
          { stage: '再次试驾', value: sum.againDrive },
          { stage: '再次成交', value: sum.againDeal },
          { stage: '综合试驾', value: sum.combinedDrive },
          { stage: '综合成交', value: unifiedCombinedDeal },
          { stage: '线索转化率', value: unifiedCombinedDeal }
        ]
        const valueMapAgg: Record<string, number> = itemsAgg.reduce((acc, it) => {
          acc[it.stage] = Math.max(0, Number((it as any).value || 0))
          return acc
        }, {} as Record<string, number>)
        const baseStageMapAgg: Record<string, string | undefined> = {
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
        const itemsWithPercentAgg = itemsAgg.map((it) => {
          const v = Math.max(0, Number((it as any).value || 0))
          const baseStage = baseStageMapAgg[it.stage]
          const baseVal = baseStage ? Math.max(0, Number(valueMapAgg[baseStage] || 0)) : v
          const pctRaw = baseStage ? (baseVal > 0 ? Math.round((v / baseVal) * 100) : 0) : v > 0 ? 100 : 0
          const pct = Math.max(0, Math.min(100, pctRaw))
          return { ...it, percent: pct, percentRaw: pctRaw, mom: 0 }
        })
        return { code: 200, msg: 'ok', data: { items: itemsWithPercentAgg } }
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
        qbOpp.andWhere('o.storeId = :sid', { sid: storeId })
      } else if (storesToQuery.length) {
        qbOpp.andWhere('o.storeId IN (:...stores)', { stores: storesToQuery })
      }
      if (Number.isFinite(modelId) && modelId > 0) {
        qbOpp.andWhere('o.focusModelId = :mid', { mid: modelId })
      }
      qbOpp.andWhere('o.latestVisitDate BETWEEN :start AND :end', {
        start: String(start),
        end: String(end)
      })
      let opps = await qbOpp.getMany()

      const qbClue = this.clueRepo.createQueryBuilder('c')
      qbClue.where('1=1')
      if (storeId) qbClue.andWhere('c.storeId = :sid', { sid: storeId })
      else if (storesToQuery.length)
        qbClue.andWhere('c.storeId IN (:...stores)', { stores: storesToQuery })
      qbClue.andWhere('c.visitDate BETWEEN :start AND :end', {
        start: String(start),
        end: String(end)
      })
      if (Number.isFinite(modelId) && modelId > 0) {
        qbClue.andWhere('(c.focusModelId = :mid OR c.dealModelId = :mid)', { mid: modelId })
      }
      if (isOnline) {
        qbClue.andWhere('c.channelCategory = :online', { online: '线上' })
        if (l1Arr.length) qbClue.andWhere('LOWER(TRIM(c.channelLevel1)) IN (:...l1)', { l1: l1Arr })
        if (qL2) qbClue.andWhere('LOWER(TRIM(c.channelLevel2)) = :l2', { l2: l2Lower })
      }
      const clues = await qbClue.getMany()

      let totalOrders = opps.length
      if (Number.isFinite(modelId) && modelId > 0) {
        const cluePhonesSetForModel = new Set(clues.map((c) => String(c.customerPhone || '')))
        opps = opps.filter((o) => cluePhonesSetForModel.has(String(o.customerPhone || '')))
        totalOrders = opps.length
      }
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

  @Get('sales-funnel/open')
  async salesFunnelOpen(@Query() query: any) {
    if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
      return { code: 403, msg: '生产环境不开放BI分析接口', data: { items: [] } }
    }
    const reqMock: any = { user: { roles: ['R_SUPER'] } }
    return await this.salesFunnel(reqMock, { ...query })
  }
}
