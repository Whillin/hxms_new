import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './modules/app.module'
import { ValidationPipe } from '@nestjs/common'
import path from 'path'
import dotenv from 'dotenv'
import { createPool } from 'mysql2/promise'
import helmet from 'helmet'
// Initialize OpenTelemetry (optional, skip if deps missing)
try {
  const { NodeSDK } = require('@opentelemetry/sdk-node')
  const { JaegerExporter } = require('@opentelemetry/exporter-jaeger')
  const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node')
  const sdk = new NodeSDK({
    traceExporter: new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces'
    }),
    instrumentations: [getNodeAutoInstrumentations()]
  })
  sdk.start()
} catch (e) {
  // ignore if OpenTelemetry packages are unavailable
}

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true })

async function ensureDatabase() {
  const host = process.env.MYSQL_HOST || 'localhost'
  const port = Number(process.env.MYSQL_PORT || 3306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || '123456'
  const db = process.env.MYSQL_DB || 'hxms_dev'

  const pool = await createPool({
    host,
    port,
    user,
    password,
    waitForConnections: true,
    connectionLimit: 5
  })
  await pool.query(
    `CREATE DATABASE IF NOT EXISTS \`${db}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  )
  await pool.end()
}

async function bootstrap() {
  await ensureDatabase()
  const app = await NestFactory.create(AppModule)
  // 让 Express 信任反向代理，正确识别 X-Forwarded-For 中的真实客户端 IP
  try {
    const instance = app.getHttpAdapter().getInstance?.()
    if (instance?.set) instance.set('trust proxy', true)
  } catch (error) {
    console.error('Failed to set trust proxy:', error)
  }
  app.enableCors({ origin: [/^http:\/\/localhost:\d+$/], credentials: true })
  // 安全响应头：在后端也加固，配合前置 Nginx/HTTPS 更佳
  app.use(
    helmet({
      contentSecurityPolicy: false, // 前端为 SPA，避免误伤
      crossOriginEmbedderPolicy: false
    })
  )
  // 明确设置 HSTS（若前置层终止 TLS，亦可在该层设置）
  app.use(
    helmet.hsts({
      maxAge: 31536000,
      includeSubDomains: true,
      preload: false
    })
  )
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true }
    })
  )
  const port = Number(process.env.PORT || 3001)
  await app.listen(port)
  console.log(`Nest server is running at http://localhost:${port}`)
  // Debug: print registered routes (Express adapter)
  try {
    const instance = app.getHttpAdapter().getInstance?.()
    const router = instance?._router
    if (router && Array.isArray(router.stack)) {
      const lines: string[] = []
      for (const layer of router.stack) {
        const route = (layer as any).route
        if (!route) continue
        const path = route.path
        const methods = Object.keys(route.methods || {})
          .filter((m) => (route.methods as any)[m])
          .map((m) => m.toUpperCase())
          .join(',')
        lines.push(`${methods.padEnd(6)} ${path}`)
      }
      if (lines.length) {
        console.log('[RouteMap] Registered routes:')
        console.log(lines.join('\n'))
      } else {
        console.log('[RouteMap] No routes found on adapter stack.')
      }
    }
  } catch (e) {
    console.error('[RouteMap] Failed to list routes:', e)
  }
}

bootstrap()
