import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { DataSource } from 'typeorm'

@Injectable()
export class DbEnsureService implements OnApplicationBootstrap {
  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    // 在容器内启动时兜底确保关键列存在（幂等），避免外部迁移失败导致字段缺失
    try {
      await this.ensureCluesVisitColumns()
    } catch (e: any) {
      // 避免影响启动流程，仅输出警告
      console.warn('[db-ensure] failed:', e?.message || e)
    }
  }

  private async ensureCluesVisitColumns() {
    const runner = this.dataSource.createQueryRunner()
    await runner.connect()
    try {
      const db = await runner.query('SELECT DATABASE() AS db')
      const dbName = db?.[0]?.db || process.env.MYSQL_DB || 'hxms_dev'

      const exists = async (col: string) => {
        const rows = await runner.query(
          `SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_schema=? AND table_name='clues' AND column_name=?`,
          [dbName, col]
        )
        return Number(rows?.[0]?.c || 0) > 0
      }

      // enterTime
      if (!(await exists('enterTime'))) {
        await runner.query(
          `ALTER TABLE clues ADD COLUMN enterTime VARCHAR(10) NULL AFTER visitDate`
        )
        console.log('[db-ensure] clues: added column enterTime')
      }
      // leaveTime
      if (!(await exists('leaveTime'))) {
        await runner.query(
          `ALTER TABLE clues ADD COLUMN leaveTime VARCHAR(10) NULL AFTER enterTime`
        )
        console.log('[db-ensure] clues: added column leaveTime')
      }
      // receptionDuration
      if (!(await exists('receptionDuration'))) {
        await runner.query(`ALTER TABLE clues ADD COLUMN receptionDuration INT NOT NULL DEFAULT 0`)
        console.log('[db-ensure] clues: added column receptionDuration')
      }
      // visitorCount
      if (!(await exists('visitorCount'))) {
        await runner.query(`ALTER TABLE clues ADD COLUMN visitorCount INT NOT NULL DEFAULT 1`)
        console.log('[db-ensure] clues: added column visitorCount')
      }
    } finally {
      await runner.release()
    }
  }
}
