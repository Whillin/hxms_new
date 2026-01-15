import { Injectable } from '@nestjs/common'

type FunnelItem = {
  stage: string
  value: number
  percent?: number
  mom?: number
}

type Insight = {
  title: string
  summary: string[]
  metrics: { name: string; value: number; percent: number }[]
  issues: string[]
  actions: string[]
}

@Injectable()
export class AiService {
  private get(items: FunnelItem[], name: string) {
    const it = items.find((x) => String(x.stage) === name)
    const v = Math.max(0, Number((it as any)?.value || 0))
    const pRaw = Number((it as any)?.percent || 0)
    const p = Math.max(0, Math.min(100, Math.round(pRaw)))
    return { value: v, percent: p }
  }

  async generateSalesFunnelInsight(
    items: FunnelItem[],
    context: Record<string, any>
  ): Promise<Insight> {
    const totalLeads = this.get(items, '全部线索数量')
    const totalOpps = this.get(items, '全部商机数量')
    const firstVisit = this.get(items, '首次到店')
    const firstDrive = this.get(items, '首次试驾')
    const firstDeal = this.get(items, '首次成交')
    const againVisit = this.get(items, '再次到店/接触（上门）')
    const againDrive = this.get(items, '再次试驾')
    const againDeal = this.get(items, '再次成交')
    const combinedDrive = this.get(items, '综合试驾')
    const combinedDeal = this.get(items, '综合成交')
    const convRate = this.get(items, '线索转化率')

    const titleParts: string[] = []
    const period = String(context.period || '')
    const storeId = Number(context.storeId || 0)
    const channelLevel1 = String(context.channelLevel1 || '')
    if (storeId > 0) titleParts.push(`门店${storeId}`)
    if (channelLevel1) titleParts.push(channelLevel1)
    if (period) titleParts.push(period)
    const title = titleParts.length
      ? `销售漏斗智能解读（${titleParts.join(' / ')}）`
      : '销售漏斗智能解读'

    const metrics = [
      { name: '全部线索数量', value: totalLeads.value, percent: totalLeads.percent },
      { name: '全部商机数量', value: totalOpps.value, percent: totalOpps.percent },
      { name: '首次到店', value: firstVisit.value, percent: firstVisit.percent },
      { name: '首次试驾', value: firstDrive.value, percent: firstDrive.percent },
      { name: '首次成交', value: firstDeal.value, percent: firstDeal.percent },
      { name: '再次到店', value: againVisit.value, percent: againVisit.percent },
      { name: '再次试驾', value: againDrive.value, percent: againDrive.percent },
      { name: '再次成交', value: againDeal.value, percent: againDeal.percent },
      { name: '综合试驾', value: combinedDrive.value, percent: combinedDrive.percent },
      { name: '综合成交', value: combinedDeal.value, percent: combinedDeal.percent },
      { name: '线索转化率', value: convRate.value, percent: convRate.percent }
    ]

    const summary: string[] = []
    summary.push(`线索总量为 ${totalLeads.value}，商机总量为 ${totalOpps.value}`)
    summary.push(`综合成交为 ${combinedDeal.value}，线索转化率约 ${convRate.percent}%`)
    summary.push(
      `首次到店比例约 ${firstVisit.percent}%、首次试驾约 ${firstDrive.percent}%、首次成交约 ${firstDeal.percent}%`
    )

    const issues: string[] = []
    const actions: string[] = []

    const pct = (a: number, b: number) => {
      if (b <= 0) return 0
      return Math.round((Math.min(a, b) / b) * 100)
    }

    const visitFromOpp = pct(firstVisit.value, totalOpps.value)
    const driveFromVisit = pct(firstDrive.value, firstVisit.value)
    const dealFromVisit = pct(firstDeal.value, firstVisit.value)
    const againVisitRate = pct(againVisit.value, totalOpps.value)
    const againDealRate = pct(againDeal.value, againVisit.value)

    if (visitFromOpp < 35) {
      issues.push('商机到店转化偏低')
      actions.push('优化邀约话术与节奏，提升到店率')
      actions.push('针对重点渠道开展到店激励活动')
    }
    if (driveFromVisit < 40) {
      issues.push('到店试驾率偏低')
      actions.push('完善试驾流程与预约机制，降低等待')
      actions.push('提升试驾车辆覆盖与维护质量')
    }
    if (dealFromVisit < 12) {
      issues.push('首次成交率偏低')
      actions.push('强化价格策略与金融方案匹配')
      actions.push('引入限时促销与置换政策')
    }
    if (againVisitRate < 20) {
      issues.push('复访触达不足')
      actions.push('建立复访SOP与提醒机制')
      actions.push('针对高意向客设定专属跟进计划')
    }
    if (againDealRate < 20 && againVisit.value > 0) {
      issues.push('复访成交效率不足')
      actions.push('在复访节点明确痛点与差异化卖点')
    }
    if (convRate.percent < 8) {
      issues.push('总体转化率偏低')
      actions.push('复盘重点渠道线索质量并优化投入结构')
    }

    if (issues.length === 0) {
      summary.push('各环节转化处于稳定区间')
      actions.push('保持关键节点表现并持续监控异常波动')
    }

    return { title, summary, metrics, issues, actions }
  }
}
