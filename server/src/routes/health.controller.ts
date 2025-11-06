import { Controller, Get, Inject } from '@nestjs/common'
import { DataSource } from 'typeorm'

@Controller('api/health')
export class HealthController {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}
  @Get('live')
  live() {
    return { code: 200, msg: 'ok', data: { uptime: process.uptime() } }
  }

  @Get('ready')
  ready() {
    // 增强就绪检查：应用启动且数据库可连接
    const baseReady = process.uptime() > 5
    let dbReady = false
    try {
      dbReady = !!this.dataSource && this.dataSource.isInitialized
    } catch {
      dbReady = false
    }
    const ready = baseReady && dbReady
    const status = ready ? 200 : 503
    return {
      code: status,
      msg: ready ? 'ok' : dbReady ? 'starting' : 'db_down',
      data: { uptime: process.uptime(), dbReady }
    }
  }
}
