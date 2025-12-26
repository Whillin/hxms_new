import { Controller, Get } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { OnlineChannel } from '../channels/online-channel.entity'

/** 线上渠道字典（来源/渠道） */
@Controller('api/channel/online')
export class ChannelOnlineController {
  constructor(@InjectRepository(OnlineChannel) private readonly repo: Repository<OnlineChannel>) {}

  /** 首次访问时按预设字典填充（不含 businessSource/category） */
  private async seedIfEmpty() {
    const count = await this.repo.count()
    if (count > 0) return

    const level1Sources = {
      新媒体: ['抖音', '微视', '小红书', '快手', '其他'],
      垂媒: ['懂车帝', '汽车之家', '易车', '其他'],
      品牌: ['品牌推荐']
    } as Record<string, string[]>

    const rows: OnlineChannel[] = []
    let sort = 1
    for (const [l1, l2list] of Object.entries(level1Sources)) {
      // 支持仅一级（空二级）占位
      const all = [''].concat(l2list)
      for (const l2 of all) {
        const compoundKey = `${l1}|${l2 || ''}`
        rows.push(
          this.repo.create({
            level1: l1,
            level2: l2 || '',
            compoundKey,
            enabled: true,
            sort: sort++
          })
        )
      }
    }
    if (rows.length) await this.repo.save(rows)
  }

  /** 返回来源与渠道选项 */
  @Get('options')
  async options() {
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
    if (!isProd && process.env.SEED_ENABLED === 'true') {
      await this.seedIfEmpty()
    }

    const l1Raw = await this.repo
      .createQueryBuilder('oc')
      .select('DISTINCT oc.level1', 'level1')
      .where('oc.enabled = 1')
      .orderBy('level1', 'ASC')
      .getRawMany()
    const level1: string[] = l1Raw.map((r: any) => r.level1)

    const level2Map: Record<string, { label: string; value: string }[]> = {}
    for (const l1 of level1) {
      const rows = await this.repo.find({ where: { level1: l1, enabled: true } })
      const l2set = new Set<string>()
      for (const r of rows) {
        if (r.level2 && r.level2.trim() !== '') l2set.add(r.level2)
      }
      level2Map[l1] = Array.from(l2set).map((v) => ({ label: v, value: v }))
    }

    return { code: 200, msg: '获取成功', data: { level1, level2Map } }
  }
}
