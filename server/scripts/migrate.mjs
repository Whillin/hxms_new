#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'

function parseEnvFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m) {
        const k = m[1]
        let v = m[2]
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1)
        }
        process.env[k] = v
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[migrate] env file not read:', filePath, String(err?.message || err))
    }
  }
}

async function connect() {
  const preferHost = process.env.MYSQL_HOST || '127.0.0.1'
  const preferPort = Number(process.env.MYSQL_PORT || 3306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || '123456'
  const db = process.env.MYSQL_DB || 'hxms_dev'

  // Try direct host first; if using docker name 'mysql' from host, fallback to 127.0.0.1:13306
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

async function ensureMigrationsTable(conn, db) {
  await conn.query(
    `CREATE TABLE IF NOT EXISTS \`${db}\`.schema_migrations (\n      version VARCHAR(128) PRIMARY KEY,\n      appliedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP\n    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  )
}

async function hasIndex(conn, db, table, indexName) {
  const [rows] = await conn.query(
    'SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME=?',
    [db, table, indexName]
  )
  return Number(rows?.[0]?.cnt || 0) > 0
}

async function hasColumn(conn, db, table, col) {
  const [rows] = await conn.query(
    'SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?',
    [db, table, col]
  )
  return Number(rows?.[0]?.cnt || 0) > 0
}

async function wasApplied(conn, db, version) {
  const [rows] = await conn.query(
    `SELECT 1 FROM \`${db}\`.schema_migrations WHERE version=? LIMIT 1`,
    [version]
  )
  return rows && rows.length > 0
}

async function markApplied(conn, db, version) {
  await conn.query(`INSERT INTO \`${db}\`.schema_migrations(version) VALUES (?)`, [version])
}

async function mig001_customers(conn, db) {
  const version = '001_customers_unique_and_indexes'
  if (await wasApplied(conn, db, version)) return

  // Ensure normal index on (storeId, phone)
  if (!(await hasIndex(conn, db, 'customers', 'idx_store_phone'))) {
    await conn.query(`CREATE INDEX idx_store_phone ON \`${db}\`.customers (storeId, phone)`)
    console.log('[migrate] created idx_store_phone')
  }

  // Ensure unique index on (storeId, phone, name)
  if (!(await hasIndex(conn, db, 'customers', 'uniq_store_phone_name'))) {
    await conn.query(
      `CREATE UNIQUE INDEX uniq_store_phone_name ON \`${db}\`.customers (storeId, phone, name)`
    )
    console.log('[migrate] created uniq_store_phone_name')
  }

  await markApplied(conn, db, version)
}

async function mig002_channels(conn, db) {
  const version = '002_channels_compound_and_indexes'
  if (await wasApplied(conn, db, version)) return

  // unique on compoundKey
  if (!(await hasIndex(conn, db, 'channels', 'uniq_channel_compound'))) {
    await conn.query(
      `CREATE UNIQUE INDEX uniq_channel_compound ON \`${db}\`.channels (compoundKey)`
    )
    console.log('[migrate] created uniq_channel_compound')
  }
  // normal indexes
  if (!(await hasIndex(conn, db, 'channels', 'idx_channel_category'))) {
    await conn.query(`CREATE INDEX idx_channel_category ON \`${db}\`.channels (category)`)
    console.log('[migrate] created idx_channel_category')
  }
  if (!(await hasIndex(conn, db, 'channels', 'idx_business_source'))) {
    await conn.query(`CREATE INDEX idx_business_source ON \`${db}\`.channels (businessSource)`)
    console.log('[migrate] created idx_business_source')
  }

  await markApplied(conn, db, version)
}

async function mig003_clues_rename(conn, db) {
  const version = '003_clues_rename_isReserved_to_isAddWeChat'
  if (await wasApplied(conn, db, version)) return

  const hasAdd = await hasColumn(conn, db, 'clues', 'isAddWeChat')
  const hasReserved = await hasColumn(conn, db, 'clues', 'isReserved')
  if (!hasAdd && hasReserved) {
    await conn.query(
      `ALTER TABLE \`${db}\`.clues CHANGE COLUMN isReserved isAddWeChat TINYINT(1) NOT NULL DEFAULT 0`
    )
    console.log('[migrate] clues: isReserved -> isAddWeChat')
  }
  await markApplied(conn, db, version)
}

async function mig004_users_profile_fields(conn, db) {
  const version = '004_users_profile_fields'
  if (await wasApplied(conn, db, version)) return

  // Add columns to users table if missing
  const additions = [
    { name: 'email', ddl: `ALTER TABLE \`${db}\`.users ADD COLUMN email VARCHAR(191) NULL` },
    { name: 'nickname', ddl: `ALTER TABLE \`${db}\`.users ADD COLUMN nickname VARCHAR(100) NULL` },
    { name: 'address', ddl: `ALTER TABLE \`${db}\`.users ADD COLUMN address VARCHAR(255) NULL` },
    { name: 'bio', ddl: `ALTER TABLE \`${db}\`.users ADD COLUMN bio TEXT NULL` },
    { name: 'avatar', ddl: `ALTER TABLE \`${db}\`.users ADD COLUMN avatar VARCHAR(255) NULL` }
  ]
  for (const add of additions) {
    if (!(await hasColumn(conn, db, 'users', add.name))) {
      await conn.query(add.ddl)
      console.log('[migrate] users: added column', add.name)
    }
  }

  await markApplied(conn, db, version)
}

async function mig005_clues_snapshots(conn, db) {
  const version = '005_clues_add_snapshots_json'
  if (await wasApplied(conn, db, version)) return

  // 添加 JSON 列（如缺失）
  const additions = [
    {
      name: 'customerSnapshot',
      ddl: `ALTER TABLE \`${db}\`.clues ADD COLUMN customerSnapshot JSON NULL`
    },
    {
      name: 'channelSnapshot',
      ddl: `ALTER TABLE \`${db}\`.clues ADD COLUMN channelSnapshot JSON NULL`
    },
    {
      name: 'productSnapshot',
      ddl: `ALTER TABLE \`${db}\`.clues ADD COLUMN productSnapshot JSON NULL`
    }
  ]
  for (const add of additions) {
    if (!(await hasColumn(conn, db, 'clues', add.name))) {
      await conn.query(add.ddl)
      console.log('[migrate] clues: added column', add.name)
    }
  }

  // 用现有冗余字段回填快照（仅空值时）
  const fillSql = `
    UPDATE \`${db}\`.clues SET
      customerSnapshot = IF(
        customerSnapshot IS NULL,
        JSON_OBJECT(
          'name', customerName,
          'phone', customerPhone,
          'gender', userGender,
          'age', userAge,
          'buyExperience', buyExperience,
          'phoneModel', userPhoneModel,
          'currentBrand', currentBrand,
          'currentModel', currentModel,
          'carAge', carAge,
          'mileage', mileage,
          'livingArea', livingArea,
          'storeId', storeId
        ),
        customerSnapshot
      ),
      channelSnapshot = IF(
        channelSnapshot IS NULL,
        JSON_OBJECT(
          'category', channelCategory,
          'businessSource', businessSource,
          'level1', channelLevel1,
          'level2', channelLevel2,
          'compoundKey', CONCAT(channelCategory,'|',businessSource,'|',COALESCE(channelLevel1,''),'|',COALESCE(channelLevel2,''))
        ),
        channelSnapshot
      ),
      productSnapshot = IF(
        productSnapshot IS NULL,
        JSON_OBJECT(
          'focus', JSON_OBJECT('id', focusModelId, 'name', focusModelName),
          'deal', JSON_OBJECT('id', dealModelId, 'name', dealModelName)
        ),
        productSnapshot
      );
  `

  await conn.query(fillSql)
  console.log('[migrate] clues: snapshots backfilled from redundant fields')

  await markApplied(conn, db, version)
}

async function mig006_clues_visit_times_and_counts(conn, db) {
  const version = '006_clues_visit_times_and_counts'
  if (await wasApplied(conn, db, version)) return

  // enterTime/leaveTime: 新增到店时间字段（HH:mm），可空
  if (!(await hasColumn(conn, db, 'clues', 'enterTime'))) {
    await conn.query(
      `ALTER TABLE \`${db}\`.clues ADD COLUMN enterTime VARCHAR(10) NULL AFTER visitDate`
    )
    console.log('[migrate] clues: added column enterTime')
  }
  if (!(await hasColumn(conn, db, 'clues', 'leaveTime'))) {
    await conn.query(
      `ALTER TABLE \`${db}\`.clues ADD COLUMN leaveTime VARCHAR(10) NULL AFTER enterTime`
    )
    console.log('[migrate] clues: added column leaveTime')
  }

  // 接待时长与到店人数：若缺失则补充（默认 0 / 1）
  if (!(await hasColumn(conn, db, 'clues', 'receptionDuration'))) {
    await conn.query(
      `ALTER TABLE \`${db}\`.clues ADD COLUMN receptionDuration INT NOT NULL DEFAULT 0`
    )
    console.log('[migrate] clues: added column receptionDuration')
  }
  if (!(await hasColumn(conn, db, 'clues', 'visitorCount'))) {
    await conn.query(`ALTER TABLE \`${db}\`.clues ADD COLUMN visitorCount INT NOT NULL DEFAULT 1`)
    console.log('[migrate] clues: added column visitorCount')
  }

  await markApplied(conn, db, version)
}

// 008: 创建线上渠道相关三表（online_channels、online_channel_daily、online_channel_daily_allocation）
async function mig008_online_channel_tables(conn, db) {
  const version = '008_online_channel_tables'
  if (await wasApplied(conn, db, version)) return

  // 线上渠道字典表
  await conn.query(`
    CREATE TABLE IF NOT EXISTS online_channels (
      id INT NOT NULL AUTO_INCREMENT,
      level1 VARCHAR(50) NOT NULL,
      level2 VARCHAR(50) NOT NULL,
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

  // 每日线上渠道填报表
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
      KEY idx_daily_compound (compoundKey),
      KEY idx_daily_level1 (level1),
      KEY idx_daily_level2 (level2)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  // 每日线上渠道分配表
  await conn.query(`
    CREATE TABLE IF NOT EXISTS online_channel_daily_allocation (
      id INT NOT NULL AUTO_INCREMENT,
      dailyId INT NOT NULL,
      employeeId INT NOT NULL,
      count INT NOT NULL DEFAULT 0,
      createdBy INT NULL,
      updatedBy INT NULL,
      uniqueKey VARCHAR(120) NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_alloc_daily_emp (uniqueKey),
      KEY idx_alloc_daily (dailyId),
      KEY idx_alloc_employee (employeeId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  await markApplied(conn, db, version)
}

// 007: 删除 online_channel_daily_allocation.roleCode，并将唯一键改为 (dailyId, employeeId)
async function mig007_alloc_remove_role_and_unique_on_daily_employee(conn, db) {
  const version = '007_alloc_remove_role_and_unique_on_daily_employee'
  if (await wasApplied(conn, db, version)) return

  const hasRoleCol = await hasColumn(conn, db, 'online_channel_daily_allocation', 'roleCode')

  if (hasRoleCol) {
    console.log(
      '[migrate] online_channel_daily_allocation: removing roleCode and rebuilding unique key'
    )

    // 创建临时新表（不含 roleCode），唯一键为 uniqueKey，值为 `${dailyId}|${employeeId}`
    await conn.query(`
      CREATE TABLE IF NOT EXISTS online_channel_daily_allocation_tmp (
        id INT NOT NULL AUTO_INCREMENT,
        dailyId INT NOT NULL,
        employeeId INT NOT NULL,
        count INT NOT NULL DEFAULT 0,
        createdBy INT NULL,
        updatedBy INT NULL,
        uniqueKey VARCHAR(120) NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_alloc_daily_emp (uniqueKey),
        KEY idx_alloc_daily (dailyId),
        KEY idx_alloc_employee (employeeId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)

    // 按 (dailyId, employeeId) 聚合旧数据并写入新表
    await conn.query(`
      INSERT INTO online_channel_daily_allocation_tmp (dailyId, employeeId, count, createdBy, updatedBy, uniqueKey)
      SELECT dailyId, employeeId, SUM(count) AS count, MIN(createdBy) AS createdBy, MIN(updatedBy) AS updatedBy,
             CONCAT(dailyId, '|', employeeId) AS uniqueKey
      FROM online_channel_daily_allocation
      GROUP BY dailyId, employeeId;
    `)

    // 备份旧表并替换
    await conn.query(
      'RENAME TABLE online_channel_daily_allocation TO online_channel_daily_allocation_old'
    )
    await conn.query(
      'RENAME TABLE online_channel_daily_allocation_tmp TO online_channel_daily_allocation'
    )

    console.log(
      '[migrate] online_channel_daily_allocation rebuilt without roleCode; old table saved as *_old'
    )
  } else {
    // 确保唯一索引存在
    const hasNewUniq = await hasIndex(
      conn,
      db,
      'online_channel_daily_allocation',
      'uniq_alloc_daily_emp'
    )
    if (!hasNewUniq) {
      await conn.query(
        `ALTER TABLE \`${db}\`.online_channel_daily_allocation ADD UNIQUE KEY uniq_alloc_daily_emp (uniqueKey)`
      )
      console.log(
        '[migrate] online_channel_daily_allocation: ensured uniq_alloc_daily_emp(uniqueKey)'
      )
    }
  }

  await markApplied(conn, db, version)
}

async function main() {
  const root = path.resolve(process.cwd(), 'server')
  parseEnvFile(path.join(root, '.env.production'))
  parseEnvFile(path.join(root, '.env'))

  const { conn, db } = await connect()
  try {
    await ensureMigrationsTable(conn, db)
    await mig001_customers(conn, db)
    await mig002_channels(conn, db)
    await mig003_clues_rename(conn, db)
    await mig004_users_profile_fields(conn, db)
    await mig005_clues_snapshots(conn, db)
    await mig006_clues_visit_times_and_counts(conn, db)
    await mig008_online_channel_tables(conn, db)
    await mig007_alloc_remove_role_and_unique_on_daily_employee(conn, db)
    console.log('[OK] migrations applied')
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error('[migrate] failed:', e?.message || e)
  process.exit(1)
})
