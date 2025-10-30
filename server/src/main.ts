import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './modules/app.module'
import { ValidationPipe } from '@nestjs/common'
import path from 'path'
import dotenv from 'dotenv'
import { createPool } from 'mysql2/promise'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

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
  app.enableCors({ origin: [/^http:\/\/localhost:\d+$/], credentials: true })
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
}

bootstrap()
