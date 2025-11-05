// Fix customers table schema and indexes on cloud DB via local SSH tunnel
// Connects to 127.0.0.1:13306 (forwarded to cloud MySQL), user root/123456
// Plan B: align cloud with local entity rules
// - Add column: storeId int NOT NULL DEFAULT 1 (if missing)
// - Create index: idx_customer_store (storeId) (if missing)
// - Drop conflicting unique indexes on phone-only or (storeId, phone)
// - Deduplicate exact triples (storeId, phone, name) keeping lowest id
// - Create unique index: uniq_store_phone_name (storeId, phone, name)
// - Create normal index: idx_store_phone (storeId, phone)

import mysql from 'mysql2/promise'

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 13306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '123456',
    multipleStatements: true
  })

  // Detect database
  const [schemas] = await conn.query(
    "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME IN ('hxms_dev','hxms')"
  )
  const schemaNames = schemas.map((r) => r.SCHEMA_NAME)
  console.log('Found schemas:', schemaNames.join(', ') || '(none)')
  if (schemaNames.length === 0) {
    throw new Error('Neither hxms_dev nor hxms database found')
  }
  for (const db of schemaNames) {
    await fixDb(conn, db)
  }
}

async function fixDb(conn, db) {
  await conn.query(`USE \`${db}\``)
  console.log(`Using database: ${db}`)

  const [tables] = await conn.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME='customers'",
    [db]
  )
  if (tables.length === 0) {
    console.log(`Skip: customers not found in ${db}`)
    return
  }

  // Ensure storeId column exists
  const [cols] = await conn.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='customers' AND COLUMN_NAME='storeId'",
    [db]
  )
  const hasStoreId = Array.isArray(cols) && cols.length > 0
  if (!hasStoreId) {
    console.log('Adding column storeId INT NOT NULL DEFAULT 1 to customers...')
    await conn.query('ALTER TABLE `customers` ADD COLUMN `storeId` INT NOT NULL DEFAULT 1')
    // Normalize any NULLs just in case (older servers may allow temporary NULLs)
    await conn.query('UPDATE `customers` SET `storeId`=1 WHERE `storeId` IS NULL')
  }

  // Get indexes (multi-row per index; aggregate columns)
  const [indexes] = await conn.query(`SHOW INDEX FROM \`${db}\`.\`customers\``)
  const map = new Map()
  for (const row of indexes) {
    if (!map.has(row.Key_name)) {
      map.set(row.Key_name, {
        name: row.Key_name,
        unique: row.Non_unique === 0,
        cols: []
      })
    }
    map.get(row.Key_name).cols[row.Seq_in_index - 1] = row.Column_name
  }
  const idxList = Array.from(map.values())
  console.log(
    'Current indexes:',
    idxList.map((i) => `${i.name}[${i.cols.join(',')}](unique=${i.unique})`).join(', ')
  )

  // Ensure single-column index on storeId
  const hasIdxCustomerStore = idxList.some(
    (i) => i.name === 'idx_customer_store' && i.cols.length === 1 && i.cols[0] === 'storeId'
  )
  if (!hasIdxCustomerStore) {
    console.log('Creating index idx_customer_store (storeId)...')
    await conn.query('CREATE INDEX `idx_customer_store` ON `customers` (`storeId`)')
  }

  // Drop legacy/conflicting unique indexes
  const shouldDrop = idxList.filter(
    (i) =>
      i.unique &&
      (i.name === 'uniq_store_phone' ||
        // Old auto-named unique on phone only
        (i.cols.length === 1 && i.cols[0] === 'phone') ||
        // Old unique on (storeId, phone)
        (i.cols.length === 2 && i.cols[0] === 'storeId' && i.cols[1] === 'phone'))
  )
  for (const i of shouldDrop) {
    console.log(`Dropping conflicting unique index ${i.name} [${i.cols.join(',')}]...`)
    await conn.query(`ALTER TABLE \`customers\` DROP INDEX \`${i.name}\``)
  }

  // Deduplicate exact triples (storeId, phone, name) keeping the smallest id
  console.log('Deduplicating duplicates on (storeId, phone, name), keeping lowest id...')
  const [dupBefore] = await conn.query(
    'SELECT COUNT(*) AS cnt FROM (SELECT `storeId`,`phone`,`name`,COUNT(*) AS c FROM `customers` GROUP BY `storeId`,`phone`,`name` HAVING c>1) AS d'
  )
  const dupCntBefore =
    Array.isArray(dupBefore) && dupBefore.length ? Number(dupBefore[0]?.cnt || 0) : 0
  if (dupCntBefore > 0) {
    console.log(`Found ${dupCntBefore} duplicate triples; applying delete...`)
    await conn.query(
      'DELETE c1 FROM `customers` c1 JOIN `customers` c2 ON c1.storeId=c2.storeId AND c1.phone=c2.phone AND c1.name=c2.name WHERE c1.id>c2.id'
    )
  } else {
    console.log('No duplicate triples found before index creation.')
  }

  // Create unique index uniq_store_phone_name if missing (storeId, phone, name)
  const hasUniqueName = idxList.some((i) => i.name === 'uniq_store_phone_name' && i.unique)
  if (!hasUniqueName) {
    // Check data for duplicates that would block unique creation
    const [dups] = await conn.query(
      'SELECT `storeId`, `phone`, `name`, COUNT(*) AS cnt FROM `customers` GROUP BY `storeId`, `phone`, `name` HAVING cnt > 1 LIMIT 10'
    )
    if (Array.isArray(dups) && dups.length > 0) {
      console.log('[WARN] Found duplicate rows that block unique index (storeId, phone, name):')
      for (const r of dups) {
        console.log(`  storeId=${r.storeId}, phone=${r.phone}, name=${r.name}, cnt=${r.cnt}`)
      }
      console.log('[SKIP] Not creating uniq_store_phone_name until duplicates are resolved.')
    } else {
      console.log('Creating unique index uniq_store_phone_name (storeId, phone, name)...')
      await conn.query(
        'CREATE UNIQUE INDEX `uniq_store_phone_name` ON `customers` (`storeId`, `phone`, `name`)'
      )
    }
  }

  // Create normal index idx_store_phone if missing (storeId, phone)
  const hasIdxStorePhone = idxList.some((i) => i.name === 'idx_store_phone' && !i.unique)
  if (!hasIdxStorePhone) {
    console.log('Creating index idx_store_phone (storeId, phone)...')
    await conn.query('CREATE INDEX `idx_store_phone` ON `customers` (`storeId`, `phone`)')
  }

  // Show final indexes
  const [finalIdxRows] = await conn.query(`SHOW INDEX FROM \`${db}\`.\`customers\``)
  const finalMap = new Map()
  for (const row of finalIdxRows) {
    if (!finalMap.has(row.Key_name)) {
      finalMap.set(row.Key_name, {
        name: row.Key_name,
        unique: row.Non_unique === 0,
        cols: []
      })
    }
    finalMap.get(row.Key_name).cols[row.Seq_in_index - 1] = row.Column_name
  }
  const finalIdx = Array.from(finalMap.values())
  console.log(
    'Final indexes:',
    finalIdx.map((i) => `${i.name}[${i.cols.join(',')}](unique=${i.unique})`).join(', ')
  )

  return
}

main().catch((err) => {
  console.error('Fix index failed:', err?.message || err)
  process.exit(1)
})
