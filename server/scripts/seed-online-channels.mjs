#!/usr/bin/env node
// 插入线上渠道字典（不含 category/businessSource）

import { createPool } from 'mysql2/promise'

async function main() {
  const host = process.env.MYSQL_HOST || 'localhost'
  const port = Number(process.env.MYSQL_PORT || 3306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || '123456'
  const db = process.env.MYSQL_DB || 'hxms_dev'

  const pool = await createPool({ host, port, user, password, waitForConnections: true })

  await pool.query(
    `CREATE DATABASE IF NOT EXISTS \`${db}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  )

  await pool.query(`USE \`${db}\``)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS online_channels (
      id INT NOT NULL AUTO_INCREMENT,
      level1 VARCHAR(50) NOT NULL,
      level2 VARCHAR(50) NOT NULL DEFAULT '',
      compoundKey VARCHAR(255) NOT NULL,
      enabled TINYINT NOT NULL DEFAULT 1,
      sort INT NOT NULL DEFAULT 0,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_online_compound (compoundKey),
      KEY idx_online_level1 (level1),
      KEY idx_online_level2 (level2)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  const rows = [
    ['新媒体', '抖音'],
    ['新媒体', '微视'],
    ['新媒体', '小红书'],
    ['新媒体', '快手'],
    ['新媒体', '其他'],
    ['垂媒', '懂车帝'],
    ['垂媒', '汽车之家'],
    ['垂媒', '易车'],
    ['垂媒', '其他'],
    ['品牌', '品牌推荐']
  ]

  let sort = 1
  const values = rows.map(([l1, l2]) => [l1, l2, `${l1}|${l2}`, 1, sort++])

  await pool.query(
    `INSERT INTO online_channels (level1, level2, compoundKey, enabled, sort) VALUES ?
     ON DUPLICATE KEY UPDATE enabled=VALUES(enabled), sort=VALUES(sort), updatedAt=CURRENT_TIMESTAMP;`,
    [values]
  )

  const [countRows] = await pool.query('SELECT COUNT(*) AS c FROM online_channels')
  const count = countRows?.[0]?.c || 0
  console.log(`[seed-online-channels] inserted/updated rows: ${values.length}, total: ${count}`)

  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
