#!/usr/bin/env node
// 直写数据库导入线索：读取Excel，经字段映射后直接插入 MySQL `clues` 表
// 适用于无法启动后端或Redis时的本地排查；通过 SSH 隧道连接云端 MySQL
// 用法示例：
// node scripts/import-clues-direct-db.mjs "C:/Users/Administrator/Desktop/客流表.xlsx" --sheet Sheet1 --store-name 泸州店 --limit 20

import fs from 'fs'
import path from 'path'
import xlsx from 'xlsx'
import { createPool } from 'mysql2/promise'

function log(...args) { console.log('[import-clues-db]', ...args) }
function err(...args) { console.error('[import-clues-db]', ...args) }

function parseArgs() {
  const argv = process.argv.slice(2)
  if (argv.length === 0) {
    err('缺少 Excel 文件路径参数')
    err('示例：node scripts/import-clues-direct-db.mjs "C:/Users/Administrator/Desktop/客流表.xlsx" --sheet Sheet1 --store-id 101')
    process.exit(2)
  }
  const input = argv[0]
  let sheetName = null
  const opts = {
    storeId: null,
    storeName: null,
    yearDefault: new Date().getFullYear(),
    dryRun: false,
    limit: 0,
    createdBy: null
  }
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--sheet') { sheetName = argv[++i]; continue }
    if (a === '--store-id') { opts.storeId = Number(argv[++i]); continue }
    if (a === '--store-name') { opts.storeName = argv[++i]; continue }
    if (a === '--year') { opts.yearDefault = Number(argv[++i]); continue }
    if (a === '--dry-run') { opts.dryRun = true; continue }
    if (a === '--limit') { opts.limit = Number(argv[++i]); continue }
    if (a === '--created-by') { opts.createdBy = Number(argv[++i]); continue }
  }
  return { input, sheetName, opts }
}

function ensureString(v) { return v == null ? '' : String(v).trim() }
function ensureDigits(v) { return v == null ? '' : String(v).replace(/[^0-9]/g, '') }
function isValidEmail(email) { return !!email && /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email) }
function isLikelyCnMobile(digits) { return /^1[3-9][0-9]{9}$/.test(digits) }
function toBoolLoose(v) {
  const s = String(v ?? '').trim().toLowerCase()
  if (!s) return false
  return ['y', 'yes', 'true', '1', '是', '有', '加', '加微', '已加', '✅'].some((k) => s.includes(k))
}
function mapReceptionStatus(v) {
  const s = String(v ?? '').trim()
  if (/无人|未接/.test(s)) return 'none'
  if (/无需|无需求/.test(s)) return 'noNeed'
  return 'sales'
}
function mapVisitCategory(v) {
  const s = String(v ?? '').trim()
  if (/再|二|复/.test(s)) return '再次'
  return '首次'
}
function mapGender(v) {
  const s = String(v ?? '').trim()
  if (/女/.test(s)) return '女'
  if (/男/.test(s)) return '男'
  return '未知'
}
function mapLevel(v, fallback = 'B') {
  const s = String(v ?? '').trim().toUpperCase()
  return ['H', 'A', 'B', 'C'].includes(s) ? s : fallback
}
function computeChannelMetaByLevel1(l1) {
  const L1 = String(l1 || '').trim()
  if (!L1) return { category: undefined, source: undefined }
  const category = ['DCC/ADC到店', '新媒体开发'].includes(L1) ? '线上' : '线下'
  const source = ['展厅到店', 'DCC/ADC到店', '车展外展'].includes(L1) ? '自然到店' : '主动开发'
  return { category, source }
}
function normalizeTimeHHMMSS(v) {
  if (!v && v !== 0) return ''
  let s = String(v).trim()
  if (!s) return ''
  const m = s.match(/(\d{1,2}:\d{1,2}(?::\d{1,2})?)$/)
  const seg = m ? m[1] : s.replace(/[^0-9:]/g, '')
  if (!seg) return ''
  const parts = seg.split(':')
  const hh = String(parts[0] || '0').padStart(2, '0')
  const mm = String(parts[1] || '0').padStart(2, '0')
  const ss = String(parts[2] || '0').padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}
function computeDurationMinutes(enter, leave) {
  if (!enter || !leave) return 0
  const [eh, em, es] = enter.split(':').map((x) => Number(x) || 0)
  const [lh, lm, ls] = leave.split(':').map((x) => Number(x) || 0)
  const start = eh * 60 + em + es / 60
  const end = lh * 60 + lm + ls / 60
  const diff = Math.round(end - start)
  return diff > 0 ? diff : 0
}
function normalizeLivingAreaPreferSCOrCQ(area) {
  let s = ensureString(area)
  if (!s) return ''
  // 统一常见分隔符，便于模式匹配
  s = s.replace(/[，、,]/g, '-').replace(/\s+/g, '')

  const provCities = {
    '四川省': ['成都', '泸州', '宜宾', '自贡', '乐山', '绵阳', '德阳', '眉山', '广元', '达州', '南充', '遂宁', '内江', '广安', '巴中', '雅安', '资阳', '凉山', '甘孜', '阿坝'],
    '重庆市': ['重庆', '渝中', '江北', '南岸', '沙坪坝', '九龙坡', '巴南', '渝北', '北碚', '大渡口', '两江', '璧山', '江津', '合川', '永川', '南川'],
    '广东省': ['广州', '深圳', '珠海', '佛山', '东莞', '中山', '惠州', '汕头', '湛江', '茂名', '江门', '肇庆', '清远', '梅州', '汕尾', '阳江', '韶关', '潮州', '揭阳', '云浮'],
    '贵州省': ['贵阳', '遵义', '六盘水', '安顺', '毕节', '铜仁', '黔东南', '黔南', '黔西南'],
    '云南省': ['昆明', '曲靖', '玉溪', '保山', '昭通', '丽江', '普洱', '临沧', '楚雄', '红河', '文山', '西双版纳', '大理', '德宏', '怒江', '迪庆'],
    '广西壮族自治区': ['南宁', '柳州', '桂林', '梧州', '北海', '防城港', '钦州', '贵港', '玉林', '百色', '贺州', '河池', '来宾', '崇左'],
    '湖南省': ['长沙', '株洲', '湘潭', '衡阳', '邵阳', '岳阳', '常德', '张家界', '益阳', '郴州', '永州', '怀化', '娄底', '湘西'],
    '湖北省': ['武汉', '黄石', '十堰', '宜昌', '襄阳', '鄂州', '荆门', '孝感', '荆州', '黄冈', '咸宁', '随州', '恩施'],
    '江西省': ['南昌', '景德镇', '萍乡', '九江', '新余', '鹰潭', '赣州', '吉安', '宜春', '抚州', '上饶'],
    '福建省': ['福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德'],
    '浙江省': ['杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水'],
    '江苏省': ['南京', '无锡', '徐州', '常州', '苏州', '南通', '连云港', '淮安', '盐城', '扬州', '镇江', '泰州', '宿迁'],
    '北京市': ['北京'], '上海市': ['上海'], '天津市': ['天津']
  }

  const strip = (p) => p.replace(/(省|市|自治区|特别行政区|壮族自治区|回族自治区|维吾尔自治区)$/g, '')
  for (const [prov, cities] of Object.entries(provCities)) {
    const provWord = strip(prov)
    const hasProv = new RegExp(provWord).test(s) || new RegExp(prov).test(s)
    const cityHit = cities.find((c) => new RegExp(`(?:^|-)${c}(?:市)?`).test(s))
    if (hasProv || cityHit) {
      const cityFull = cityHit ? `${cityHit}市` : undefined
      // 去掉头部已出现的省/市名，避免前缀重复
      let detail = s
      detail = detail.replace(new RegExp(`^(${prov}|${provWord})-?`), '')
      if (cityFull) detail = detail.replace(new RegExp(`^(${cityHit}|${cityFull})-?`), '')
      const prefix = cityFull ? `${prov}-${cityFull}` : `${prov}`
      return detail ? `${prefix}-${detail}` : prefix
    }
  }
  return s
}
function normalizeDateYYYYMMDD(v, yearDefault) {
  if (!v) return ''
  if (v instanceof Date) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  let s = String(v).trim()
  s = s.replace(/年|\.|\//g, '-')
  s = s.replace(/月/g, '-')
  s = s.replace(/日/g, '')
  s = s.replace(/\s+/g, '')
  s = s.split(/\s|T/)[0]
  // 支持两位年份：MM-DD-YY 或 M-D-YY（统一到 20YY）
  const mShort = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/)
  if (mShort) {
    const mm = String(mShort[1]).padStart(2, '0')
    const dd = String(mShort[2]).padStart(2, '0')
    const yy = Number(mShort[3])
    const y = 2000 + (Number.isFinite(yy) ? yy : 0)
    return `${y}-${mm}-${dd}`
  }
  // 兼容四位年份：MM-DD-YYYY 或 M-D-YYYY
  const mLong = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (mLong) {
    const mm = String(mLong[1]).padStart(2, '0')
    const dd = String(mLong[2]).padStart(2, '0')
    const y = String(mLong[3])
    return `${y}-${mm}-${dd}`
  }
  if (/^\d{1,2}-\d{1,2}$/.test(s)) return `${yearDefault}-${s.split('-').map((p)=>p.padStart(2,'0')).join('-')}`
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    const y = m[1]
    const mm = String(m[2]).padStart(2, '0')
    const dd = String(m[3]).padStart(2, '0')
    return `${y}-${mm}-${dd}`
  }
  return s
}

function detectColumns(headers) {
  const has = (h, pats) => pats.some((p) => new RegExp(p, 'i').test(h))
  const find = (pats) => headers.find((h) => has(h, pats))
  return {
    dateKey: find(['到店日', '到店日期', '日期', '来访日期', 'visit']),
    nameKey: find(['客户姓名', '姓名', '顾客姓名', '联系人', 'name']),
    phoneKey: find(['手机号', '手机', '电话', '联系电话', '联系方式', 'mobile', 'phone']),
    receptionKey: find(['接待情况', '是否接待', '接待']),
    consultantKey: find(['销售顾问', '顾问', '接待人', '接待人员']),
    visitorCountKey: find(['到店人数', '来店人数', '到店人次', '人次']),
    durationKey: find(['接待时长', '时长']),
    enterTimeKey: find(['进店时', '进店时间', '到店时间']),
    leaveTimeKey: find(['离店时', '离店时间']),
    addWeChatKey: find(['是否加微', '加微', '加微信', '加V', '是否留资', '留资']),
    visitCatKey: find(['到店分类', '首次', '再次']),
    categoryKey: find(['渠道分类', '渠道分', '线索分类', '渠道', '线上线下', 'channel']),
    sourceKey: find(['业务来源', '商机来源', '来源', '线索来源', 'source']),
    level1Key: find(['渠道一级', '一级渠道', '来源一级', '一级来源']),
    level2Key: find(['渠道二级', '二级渠道', '来源二级', '二级来源']),
    focusModelKey: find(['关注车型', '意向车型', '车型关注']),
    dealModelKey: find(['成交车型', '实际成交车型']),
    levelKey: find(['商机级别', '商机等级', '级别', '等级']),
    genderKey: find(['性别']),
    ageKey: find(['年龄']),
    expKey: find(['购车经历', '是否首购', '首购', '换购', '增购']),
    phoneModelKey: find(['使用手机', '手机品牌', '手机型号']),
    curBrandKey: find(['现有品牌', '现用品牌', '持有品牌']),
    curModelKey: find(['现有车型', '持有车型', '现用车型']),
    carAgeKey: find(['车龄']),
    mileageKey: find(['里程', '公里', 'km']),
    areaKey: find(['居住区域', '地区', '住址', '居住区']),
    contactTimesKey: find(['联系次数', '跟进次数', '接触次数'])
  }
}

function buildClueItem(row, cols, ctx) {
  const name = ensureString(row[cols.nameKey]) || '未命名客户'
  const phoneDigits = ensureDigits(row[cols.phoneKey])
  const email = ensureString(row['邮箱'] || row['电子邮件'] || row['email'] || '')
  const date = normalizeDateYYYYMMDD(row[cols.dateKey], ctx.yearDefault)

  const hasValidPhone = phoneDigits.length >= 7 && (isLikelyCnMobile(phoneDigits) || phoneDigits.length >= 7)
  const hasValidEmail = isValidEmail(email)
  if (!hasValidPhone && !hasValidEmail) return null
  if (!date) return null

  const item = {
    visitDate: date,
    customerName: name,
    customerPhone: phoneDigits,
    receptionStatus: mapReceptionStatus(row[cols.receptionKey]),
    salesConsultant: ensureString(row[cols.consultantKey]) || undefined,
    visitorCount: Number(row[cols.visitorCountKey] ?? 1) || 1,
    // 时间统一为 HH:mm:ss；若未给时长或为0，则按进/离店差值补齐
    enterTime: normalizeTimeHHMMSS(row[cols.enterTimeKey]) || undefined,
    leaveTime: normalizeTimeHHMMSS(row[cols.leaveTimeKey]) || undefined,
    receptionDuration: (() => {
      const raw = Number(row[cols.durationKey] ?? 0) || 0
      if (raw > 0) return raw
      const e = normalizeTimeHHMMSS(row[cols.enterTimeKey])
      const l = normalizeTimeHHMMSS(row[cols.leaveTimeKey])
      return computeDurationMinutes(e, l)
    })(),
    isAddWeChat: toBoolLoose(row[cols.addWeChatKey]),
    visitCategory: mapVisitCategory(row[cols.visitCatKey]),
    channelLevel1: ensureString(row[cols.level1Key]) || undefined,
    channelLevel2: ensureString(row[cols.level2Key]) || undefined,
    // 若提供了一级渠道，以其推导分类与来源（优先覆盖Excel的两个列）
    ...( (() => { const meta = computeChannelMetaByLevel1(row[cols.level1Key]); return {
      businessSource: meta.source || (ensureString(row[cols.sourceKey]) || '自然到店'),
      channelCategory: meta.category || (ensureString(row[cols.categoryKey]) || '线下')
    } })() ),
    focusModelName: ensureString(row[cols.focusModelKey]) || undefined,
    dealModelName: ensureString(row[cols.dealModelKey]) || undefined,
    opportunityLevel: mapLevel(row[cols.levelKey] ?? ctx.defaultLevel, ctx.defaultLevel),
    userGender: mapGender(row[cols.genderKey]),
    userAge: Number(row[cols.ageKey] ?? 0) || 0,
    buyExperience: (/换/.test(String(row[cols.expKey] ?? '')) ? '换购' : (/增/.test(String(row[cols.expKey] ?? '')) ? '增购' : '首购')),
    userPhoneModel: ensureString(row[cols.phoneModelKey]) || undefined,
    currentBrand: ensureString(row[cols.curBrandKey]) || undefined,
    currentModel: ensureString(row[cols.curModelKey]) || undefined,
    carAge: Number(row[cols.carAgeKey] ?? 0) || 0,
    mileage: Number(row[cols.mileageKey] ?? 0) || 0,
    livingArea: normalizeLivingAreaPreferSCOrCQ(row[cols.areaKey]) || undefined,
    contactTimes: Number(row[cols.contactTimesKey] ?? 1) || 1,
    visitPurpose: '看车',
    storeId: ctx.storeId
  }
  return item
}

async function resolveStoreId(pool, storeId, storeName) {
  if (typeof storeId === 'number' && storeId > 0) return storeId
  if (!storeName) throw new Error('请提供 --store-id 或 --store-name')
  const [rows] = await pool.query('SELECT id FROM departments WHERE type=? AND name=? LIMIT 1', ['store', storeName])
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`未找到门店：${storeName}`)
  return Number(rows[0].id)
}

async function insertClue(conn, item) {
  const sql = `INSERT INTO clues SET
    visitDate=?, enterTime=?, leaveTime=?,
    receptionDuration=?, visitorCount=?,
    receptionStatus=?, salesConsultant=?,
    customerName=?, customerPhone=?, customerId=?,
    visitPurpose=?, isAddWeChat=?, visitCategory=?,
    focusModelId=?, focusModelName=?,
    testDrive=?, bargaining=?, dealDone=?,
    dealModelId=?, dealModelName=?,
    businessSource=?, channelCategory=?, channelLevel1=?, channelLevel2=?,
    channelId=?, convertOrRetentionModel=?, referrer=?, contactTimes=?,
    opportunityLevel=?, userGender=?, userAge=?, buyExperience=?,
    userPhoneModel=?, currentBrand=?, currentModel=?, carAge=?, mileage=?, livingArea=?,
    brandId=?, regionId=?, storeId=?, departmentId=?, createdBy=?`

  const params = [
    item.visitDate, item.enterTime || null, item.leaveTime || null,
    Number(item.receptionDuration || 0), Number(item.visitorCount || 1),
    item.receptionStatus || 'sales', item.salesConsultant || null,
    item.customerName, item.customerPhone, item.customerId || null,
    item.visitPurpose || '看车', item.isAddWeChat ? 1 : 0, item.visitCategory || '首次',
    item.focusModelId || null, item.focusModelName || null,
    item.testDrive ? 1 : 0, item.bargaining ? 1 : 0, item.dealDone ? 1 : 0,
    item.dealModelId || null, item.dealModelName || null,
    item.businessSource || '自然到店', item.channelCategory || '线下', item.channelLevel1 || null, item.channelLevel2 || null,
    item.channelId || null, item.convertOrRetentionModel || null, item.referrer || null, Number(item.contactTimes || 1),
    item.opportunityLevel || 'B', item.userGender || '未知', Number(item.userAge || 0), item.buyExperience || '首购',
    item.userPhoneModel || null, item.currentBrand || null, item.currentModel || null, Number(item.carAge || 0), Number(item.mileage || 0), item.livingArea || null,
    item.brandId || null, item.regionId || null, Number(item.storeId), item.departmentId || null, item.createdBy || null
  ]

  await conn.query(sql, params)
}

async function resolveModelId(pool, name) {
  const n = ensureString(name)
  if (!n) return null
  const [rows] = await pool.query('SELECT id FROM product_models WHERE name=? LIMIT 1', [n])
  if (Array.isArray(rows) && rows.length) return Number(rows[0].id)
  return null
}

async function getOrCreateChannelId(conn, category, source, level1, level2) {
  const cat = ensureString(category) || '线下'
  const src = ensureString(source) || '自然到店'
  const l1 = ensureString(level1) || null
  const l2 = ensureString(level2) || null
  const compoundKey = [cat, src, l1 || '', l2 || ''].join('|')
  const [rows] = await conn.query('SELECT id FROM channels WHERE compoundKey=? LIMIT 1', [compoundKey])
  if (Array.isArray(rows) && rows.length) return Number(rows[0].id)
  await conn.query('INSERT INTO channels SET category=?, businessSource=?, level1=?, level2=?, compoundKey=?', [cat, src, l1, l2, compoundKey])
  const [rows2] = await conn.query('SELECT id FROM channels WHERE compoundKey=? LIMIT 1', [compoundKey])
  return Array.isArray(rows2) && rows2.length ? Number(rows2[0].id) : null
}

async function resolveBrandRegionByStore(conn, storeId) {
  // 逐级向上查找父节点，收集 brand/region 的 id
  let brandId = null, regionId = null, depId = storeId
  let curId = storeId
  const getRow = async (id) => {
    const [rows] = await conn.query('SELECT id, parentId, type FROM departments WHERE id=? LIMIT 1', [id])
    return Array.isArray(rows) && rows.length ? rows[0] : null
  }
  let row = await getRow(curId)
  const MAX_HOPS = 20
  let hops = 0
  while (row && hops < MAX_HOPS && (brandId == null || regionId == null)) {
    const type = String(row.type || '')
    if (type === 'brand' && brandId == null) brandId = Number(row.id)
    if (type === 'region' && regionId == null) regionId = Number(row.id)
    if (!row.parentId) break
    curId = Number(row.parentId)
    row = await getRow(curId)
    hops++
  }
  return { brandId, regionId, departmentId: depId }
}

// 在 customers 表按“门店+手机号+姓名”查找或建档，并返回客户ID
async function getOrCreateCustomerId(conn, storeId, name, phone, profile = {}) {
  const nm = String(name || '').trim() || '未命名客户'
  const ph = String(phone || '').trim()
  if (!ph) return null
  const [rows] = await conn.query('SELECT id FROM customers WHERE storeId=? AND phone=? AND name=? LIMIT 1', [storeId, ph, nm])
  if (Array.isArray(rows) && rows.length) return Number(rows[0].id)
  try {
    await conn.query(
      'INSERT INTO customers SET name=?, storeId=?, phone=?, gender=?, age=?, buyExperience=?, phoneModel=?, currentBrand=?, currentModel=?, carAge=?, mileage=?, livingArea=?',
      [
        nm,
        Number(storeId),
        ph,
        profile.gender || '未知',
        Number(profile.age || 0),
        profile.buyExperience || '首购',
        profile.phoneModel || null,
        profile.currentBrand || null,
        profile.currentModel || null,
        Number(profile.carAge || 0),
        Number(profile.mileage || 0),
        profile.livingArea || null
      ]
    )
  } catch (e) {
    // 可能被并发插入击中唯一约束，忽略后续以查找为准
  }
  const [rows2] = await conn.query('SELECT id FROM customers WHERE storeId=? AND phone=? AND name=? LIMIT 1', [storeId, ph, nm])
  return Array.isArray(rows2) && rows2.length ? Number(rows2[0].id) : null
}

async function main() {
  const { input, sheetName, opts } = parseArgs()
  if (!fs.existsSync(input)) {
    err('文件不存在：', input)
    process.exit(2)
  }

  const host = process.env.MYSQL_HOST || '127.0.0.1'
  const port = Number(process.env.MYSQL_PORT || 13306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || '123456'
  const database = process.env.MYSQL_DB || 'hxms_dev'

  const pool = await createPool({ host, port, user, password, database, waitForConnections: true })
  const conn = await pool.getConnection()
  log('连接数据库：', { host, port, user, database })

  try {
    const wb = xlsx.readFile(input, { cellDates: true })
    const targetSheet = sheetName || wb.SheetNames[0]
    const ws = wb.Sheets[targetSheet]
    if (!ws) { err('找不到工作表：', targetSheet); process.exit(2) }
    const rows = xlsx.utils.sheet_to_json(ws, { defval: '', raw: false })
    if (rows.length === 0) { err('工作表为空'); process.exit(2) }

    const headersSet = new Set(); rows.forEach((r) => Object.keys(r).forEach((k) => headersSet.add(k)))
    const headers = Array.from(headersSet)
    const cols = detectColumns(headers)
    log('字段识别：', cols)

    const storeId = await resolveStoreId(pool, opts.storeId, opts.storeName)
    const ctx = { storeId, yearDefault: opts.yearDefault, defaultLevel: 'B' }

    let total = 0, prepared = 0, inserted = 0, skipped = 0, failed = 0

    await conn.query('SET FOREIGN_KEY_CHECKS=1')
    for (const row of rows) {
      if (opts.limit && total >= opts.limit) break
      total++
      const item = buildClueItem(row, cols, ctx)
      if (!item) { skipped++; continue }
      prepared++
      if (opts.dryRun) continue
      try {
        // 车型ID补齐
        item.focusModelId = await resolveModelId(pool, item.focusModelName)
        item.dealModelId = await resolveModelId(pool, item.dealModelName)
        // 渠道ID关联（按四元组唯一）
        const chId = await getOrCreateChannelId(conn, item.channelCategory, item.businessSource, item.channelLevel1, item.channelLevel2)
        item.channelId = chId
        // 品牌/区域沿门店父链补齐；departmentId=门店ID
        const br = await resolveBrandRegionByStore(conn, storeId)
        item.brandId = br.brandId
        item.regionId = br.regionId
        item.departmentId = br.departmentId
        // 客户建档并回填 customerId（仅当手机号有效）
        if (String(item.customerPhone || '').trim()) {
          item.customerId = await getOrCreateCustomerId(conn, storeId, item.customerName, item.customerPhone, {
            gender: item.userGender,
            age: Number(item.userAge || 0),
            buyExperience: item.buyExperience,
            phoneModel: item.userPhoneModel,
            currentBrand: item.currentBrand,
            currentModel: item.currentModel,
            carAge: Number(item.carAge || 0),
            mileage: Number(item.mileage || 0),
            livingArea: item.livingArea
          })
        }
        // 创建人（可选参数）
        item.createdBy = typeof opts.createdBy === 'number' ? opts.createdBy : null
        await insertClue(conn, item)
        inserted++
      } catch (e) {
        failed++
        err('插入失败：', e?.message || String(e))
      }
    }

    const report = { input, sheet: targetSheet, storeId, total, prepared, inserted, skipped, failed, dryRun: opts.dryRun }
    log('导入完成：', report)
    try {
      const outDir = path.join(path.dirname(input), 'import-output')
      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(path.join(outDir, 'import-report-db.json'), JSON.stringify(report, null, 2), 'utf8')
      log('已生成导入报告：', path.join(outDir, 'import-report-db.json'))
    } catch {}
  } finally {
    conn.release()
    await pool.end()
  }
}

main().catch((e) => {
  err('导入过程异常：', e?.message || e)
  process.exit(1)
})