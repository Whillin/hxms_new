#!/usr/bin/env node
// 修复 online_channels 表结构：删除 category/businessSource 列并整理索引

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

async function columnExists(conn, db, table, column) {
  const [rows] = await conn.query(
    'SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?',
    [db, table, column]
  )
  return rows[0].cnt > 0
}

async function indexExists(conn, db, table, indexName) {
  const [rows] = await conn.query(
    'SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME=?',
    [db, table, indexName]
  )
  return rows[0].cnt > 0
}

async function ensureSchema(conn, db) {
  // 确保表存在（不改变现有列）
  await conn.query(
    `CREATE TABLE IF NOT EXISTS online_channels (
      id INT NOT NULL AUTO_INCREMENT,
      level1 VARCHAR(50) NOT NULL,
      level2 VARCHAR(50) NOT NULL DEFAULT '',
      compoundKey VARCHAR(255) NOT NULL,
      enabled TINYINT NOT NULL DEFAULT 1,
      sort INT NOT NULL DEFAULT 0,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  )

  // 删除不需要的列
  for (const col of ['category', 'businessSource']) {
    if (await columnExists(conn, db, 'online_channels', col)) {
      console.log(`[schema] dropping column ${col}`)
      await conn.query('ALTER TABLE online_channels DROP COLUMN `' + col + '`')
    } else {
      console.log(`[schema] column ${col} already absent`)
    }
  }

  // 清理可能存在的旧索引
  for (const idx of ['idx_online_category', 'idx_online_business_source']) {
    if (await indexExists(conn, db, 'online_channels', idx)) {
      console.log(`[schema] dropping index ${idx}`)
      await conn.query('ALTER TABLE online_channels DROP INDEX `' + idx + '`')
    }
  }

  // 确保必要索引存在
  if (!(await indexExists(conn, db, 'online_channels', 'uniq_online_compound'))) {
    console.log('[schema] creating unique index uniq_online_compound(compoundKey)')
    await conn.query(
      'ALTER TABLE online_channels ADD UNIQUE KEY `uniq_online_compound` (`compoundKey`)'
    )
  }

  if (!(await indexExists(conn, db, 'online_channels', 'idx_online_level1'))) {
    console.log('[schema] creating index idx_online_level1(level1)')
    await conn.query('ALTER TABLE online_channels ADD KEY `idx_online_level1` (`level1`)')
  }

  if (!(await indexExists(conn, db, 'online_channels', 'idx_online_level2'))) {
    console.log('[schema] creating index idx_online_level2(level2)')
    await conn.query('ALTER TABLE online_channels ADD KEY `idx_online_level2` (`level2`)')
  }
}

async function main() {
  const { conn, db } = await connect()
  try {
    await ensureSchema(conn, db)
    const [cols] = await conn.query(
      'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION',
      [db, 'online_channels']
    )
    console.log('[schema] final columns:', cols.map((r) => r.COLUMN_NAME).join(', '))
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
