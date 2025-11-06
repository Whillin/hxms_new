import { Controller, Get } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Channel } from '../channels/channel.entity'

/** 渠道选项与种子填充 */
@Controller('api/channel')
export class ChannelsController {
  constructor(@InjectRepository(Channel) private readonly repo: Repository<Channel>) {}

  private async seedIfEmpty() {
    const count = await this.repo.count()
    if (count > 0) return

    const L1 = [
      '展厅到店',
      'DCC/ADC到店',
      '车展外展',
      '新媒体开发',
      '转化开发',
      '保客开发',
      '转介绍开发',
      '大用户开发'
    ]

    const L2Map: Record<string, string[]> = {
      'DCC/ADC到店': [
        'DCC/ADC(懂车帝）',
        'DCC/ADC(汽车之家）',
        'DCC/ADC（品牌推荐）',
        'DCC/ADC(易车）',
        'DCC/ADC(其他垂媒）'
      ],
      新媒体开发: [
        '新媒体（公司抖音）',
        '新媒体（公司小红书/其他）',
        '新媒体（个人小红书）',
        '新媒体（个人抖音/其他）'
      ],
      保客开发: ['保客（小鹏)', '保客（奥迪)'],
      转介绍开发: ['转介绍（客户）', '转介绍（内部）', '转介绍（圈层）'],
      大用户开发: ['大用户（外拓）']
    }

    const computeCategory = (l1: string) =>
      ['DCC/ADC到店', '新媒体开发'].includes(l1) ? '线上' : '线下'
    const computeSource = (l1: string) =>
      ['展厅到店', 'DCC/ADC到店', '车展外展'].includes(l1) ? '自然到店' : '主动开发'

    const records: Channel[] = []
    for (const l1 of L1) {
      const category = computeCategory(l1)
      const businessSource = computeSource(l1)
      const l2List = L2Map[l1] || []
      // 插入空二级以支持仅一级选择
      const allL2 = l2List.length ? [''].concat(l2List) : ['']
      for (const l2 of allL2) {
        const compoundKey = `${category}|${businessSource}|${l1}|${l2 || ''}`
        const row = this.repo.create({
          category,
          businessSource,
          level1: l1,
          level2: l2 || undefined,
          compoundKey
        })
        records.push(row)
      }
    }

    if (records.length) await this.repo.save(records)
  }

  /** 渠道选项：从数据库返回一级列表、二级映射与一级元数据 */
  @Get('options')
  async options() {
    if (process.env.SEED_ENABLED === 'true') {
      await this.seedIfEmpty()
    }

    // DISTINCT 一级渠道
    const rawL1 = await this.repo
      .createQueryBuilder('c')
      .select('DISTINCT c.level1', 'level1')
      .where('c.level1 IS NOT NULL AND c.level1 <> ""')
      .orderBy('c.level1', 'ASC')
      .getRawMany()
    const level1: string[] = rawL1.map((r: any) => r.level1)

    // 构建二级映射与一级元数据
    const level2Map: Record<string, { label: string; value: string }[]> = {}
    const metaByLevel1: Record<string, { category: string; businessSource: string }> = {}

    for (const l1 of level1) {
      const rows = await this.repo.find({ where: { level1: l1 } })
      const l2set = new Set<string>()
      for (const r of rows) {
        if (r.level2 && r.level2.trim() !== '') l2set.add(r.level2)
        // 元数据：按一级统一即可
        if (!metaByLevel1[l1])
          metaByLevel1[l1] = { category: r.category, businessSource: r.businessSource }
      }
      level2Map[l1] = Array.from(l2set).map((v) => ({ label: v, value: v }))
    }

    return { code: 200, msg: '获取成功', data: { level1, level2Map, metaByLevel1 } }
  }
}
