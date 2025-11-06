import { Controller, Get, Header, Logger } from '@nestjs/common'
import { collectDefaultMetrics, register, Gauge } from 'prom-client'

// 基础 Prometheus 指标端点：/api/metrics
// 适用于快速对接监控采集（Grafana/Prometheus/腾讯云可观测）
@Controller('api')
export class MetricsController {
  private initialized = false
  private readonly logger = new Logger(MetricsController.name)
  private readonly upGauge = new Gauge({ name: 'hxms_api_up', help: 'API up indicator' })

  private initOnce() {
    if (this.initialized) return
    this.initialized = true
    try {
      collectDefaultMetrics({ prefix: 'hxms_' })
      this.upGauge.set(1)
      this.logger.log('Prometheus default metrics enabled')
    } catch (e) {
      this.logger.warn('Prometheus metrics init failed, falling back to disabled stub: ' + e)
    }
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics() {
    this.initOnce()
    try {
      return await register.metrics()
    } catch {
      return [
        '# HELP hxms_api_metrics_disabled Prometheus metrics are disabled',
        '# TYPE hxms_api_metrics_disabled gauge',
        'hxms_api_metrics_disabled 1'
      ].join('\n') + '\n'
    }
  }
}