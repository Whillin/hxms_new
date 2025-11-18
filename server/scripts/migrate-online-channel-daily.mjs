#!/usr/bin/env node
// 幂等创建 online_channel_daily 表及索引
import mysql from 'mysql2/promise'

async function connect() {
  const preferHost = process.env.MYSQL_HOST || '127.0.0.1'
  const preferPort = Number(process.env.MYSQL_PORT || 3306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || '123456'
  const db = process.env.MYSQL_DB || 'hxms_dev'

  const candidates = [
    { host: preferHost, port: preferPort },
    { host: '127.0.0.1', port: 13306 }
  ]

  let lastErr
  for (const c of candidates) {
    try {
      const conn = await mysql.createConnection({
        host: c.host,
        port: c.port,
        user,
        password,
        database: db,
        multipleStatements: true
      })
      return { conn, db }
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('Unable to connect to MySQL')
}

async function main() {
  const { conn, db } = await connect()
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${db}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    )
    await conn.query(`USE \`${db}\``)

    await conn.query(`
      CREATE TABLE IF NOT EXISTS online_channel_daily (
        id INT NOT NULL AUTO_INCREMENT,
        storeId INT NOT NULL,
        date DATE NOT NULL,
        compoundKey VARCHAR(255) NOT NULL,
        level1 VARCHAR(50) NOT NULL,
        level2 VARCHAR(50) NOT NULL,
        count INT NOT NULL DEFAULT 0,
        isBackfill TINYINT NOT NULL DEFAULT 0,
        submitted TINYINT NOT NULL DEFAULT 0,
        createdBy INT NULL,
        updatedBy INT NULL,
        uniqueKey VARCHAR(100) NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_daily_store_date_key (uniqueKey),
        KEY idx_daily_store_date (storeId, date),
        KEY idx_daily_level1 (level1),
        KEY idx_daily_level2 (level2),
        KEY idx_daily_compound (compoundKey)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)

    console.log('[migrate] online_channel_daily ensured')
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
