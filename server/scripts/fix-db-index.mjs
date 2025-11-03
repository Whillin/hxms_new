// Fix customers table indexes on cloud DB via local SSH tunnel
// Connects to 127.0.0.1:13306 (forwarded to cloud MySQL), user root/123456
// Ensures unique index: uniq_store_phone_name (store, phone, name)
// Ensures normal index: idx_store_phone (store, phone)
// Drops legacy unique index: uniq_store_phone if present

import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 13306,
    user: 'root',
    password: '123456',
    multipleStatements: true,
  });

  // Detect database
  const [schemas] = await conn.query(
    "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME IN ('hxms_dev','hxms')"
  );
  const schemaNames = schemas.map((r) => r.SCHEMA_NAME);
  console.log('Found schemas:', schemaNames.join(', ') || '(none)');
  if (schemaNames.length === 0) {
    throw new Error('Neither hxms_dev nor hxms database found');
  }
  for (const db of schemaNames) {
    await fixDb(conn, db);
  }

}

async function fixDb(conn, db) {
  await conn.query(`USE \`${db}\``);
  console.log(`Using database: ${db}`);

  const [tables] = await conn.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME='customers'",
    [db]
  );
  if (tables.length === 0) {
    console.log(`Skip: customers not found in ${db}`);
    return;
  }

  // Get indexes
  const [indexes] = await conn.query(`SHOW INDEX FROM \`${db}\`.\`customers\``);
  const byName = Object.create(null);
  for (const idx of indexes) {
    byName[idx.Key_name] = idx;
  }
  console.log('Current indexes:', indexes.map(i => `${i.Key_name}(unique=${i.Non_unique===0})`).join(', '));

  // Drop legacy unique index uniq_store_phone if exists and is unique
  if (byName['uniq_store_phone'] && byName['uniq_store_phone'].Non_unique === 0) {
    console.log('Dropping legacy unique index uniq_store_phone...');
    await conn.query('ALTER TABLE `customers` DROP INDEX `uniq_store_phone`');
  }

  // Create unique index uniq_store_phone_name if missing (storeId, phone, name)
  const hasUniqueName = indexes.some(
    (i) => i.Key_name === 'uniq_store_phone_name' && i.Non_unique === 0
  );
  if (!hasUniqueName) {
    console.log('Creating unique index uniq_store_phone_name (storeId, phone, name)...');
    await conn.query(
      'CREATE UNIQUE INDEX `uniq_store_phone_name` ON `customers` (`storeId`, `phone`, `name`)'
    );
  }

  // Create normal index idx_store_phone if missing (storeId, phone)
  const hasIdxStorePhone = indexes.some(
    (i) => i.Key_name === 'idx_store_phone' && i.Non_unique === 1
  );
  if (!hasIdxStorePhone) {
    console.log('Creating index idx_store_phone (storeId, phone)...');
    await conn.query(
      'CREATE INDEX `idx_store_phone` ON `customers` (`storeId`, `phone`)'
    );
  }

  // Show final indexes
  const [finalIdx] = await conn.query(`SHOW INDEX FROM \`${db}\`.\`customers\``);
  console.log('Final indexes:', finalIdx.map(i => `${i.Key_name}(unique=${i.Non_unique===0})`).join(', '));

  return;
}

main().catch((err) => {
  console.error('Fix index failed:', err?.message || err);
  process.exit(1);
});