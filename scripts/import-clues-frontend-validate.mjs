#!/usr/bin/env node
// 说明：
// 复刻前端到店客流表(index.vue)的录入校验与联动规则，
// 读取 Excel，构建线索数据，先进行前端规则校验；
// 不满足规则的输出到 CSV；满足规则的按 /api/clue/save 接口提交，模拟“真人前端添加”。

import fs from 'fs'
import path from 'path'
import xlsx from 'xlsx'

// 常量与辅助
const ALLOWED_PRIMARY_REFERRER = ['转化开发', '保客开发']
const ALLOWED_REFERRER = ['转化开发', '保客开发', '转介绍开发']
const isWindows = process.platform === 'win32'

function err(msg) {
  console.error(`[ERROR] ${msg}`)
}
function info(msg) {
  console.log(`[INFO] ${msg}`)
}
function warn(msg) {
  console.warn(`[WARN] ${msg}`)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    input: undefined,
    sheet: undefined,
    serverUrl: process.env.SERVER_URL || 'http://106.52.174.194',
    user: process.env.IMPORT_USER || 'Admin',
    pass: process.env.IMPORT_PASS || '123456',
    storeId: undefined,
    storeName: undefined,
    limit: undefined,
    dryRun: false,
    invalidCsv: 'scripts/output/invalid_clues.csv',
  }
  if (!args.length) {
    err('用法：node scripts/import-clues-frontend-validate.mjs "C:/路径/客流表.xlsx" --sheet Sheet1 --store-name 泸州店 [--dry-run] [--invalid-csv scripts/output/invalid_clues.csv]')
    err('示例：node scripts/import-clues-frontend-validate.mjs "C:/Users/Administrator/Desktop/客流表.xlsx" --sheet Sheet1 --store-name 泸州店 --server-url http://106.52.174.194')
    process.exit(1)
  }
  opts.input = args[0]
  for (let i = 1; i < args.length; i++) {
    const a = args[i]
    const next = args[i + 1]
    if (a === '--sheet') opts.sheet = next, i++
    else if (a === '--server-url') opts.serverUrl = next, i++
    else if (a === '--user') opts.user = next, i++
    else if (a === '--pass') opts.pass = next, i++
    else if (a === '--store-id') opts.storeId = Number(next), i++
    else if (a === '--store-name') opts.storeName = next, i++
    else if (a === '--limit') opts.limit = Number(next), i++
    else if (a === '--invalid-csv') opts.invalidCsv = next, i++
    else if (a === '--dry-run') opts.dryRun = true
  }
  return opts
}

// HTTP 辅助（对齐后端返回结构：{ code, data }）
async function httpJson(url, method = 'GET', body = undefined, token = undefined) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  return { status: res.status, data }
}

async function ensureServerReady(serverUrl) {
  const url = new URL('/api/health/ready', serverUrl).toString()
  const { status, data } = await httpJson(url, 'GET')
  return status === 200 && Number(data?.data?.uptime || 0) > 0
}

async function loginOrRegister(serverUrl, user, pass) {
  const loginUrl = new URL('/api/auth/login', serverUrl).toString()
  const regUrl = new URL('/api/auth/register', serverUrl).toString()
  const loginBody = { userName: user, password: pass }
  const r1 = await httpJson(loginUrl, 'POST', loginBody)
  if (r1?.data?.code === 200 && r1?.data?.data?.token) return r1.data.data.token
  warn(`登录失败（可能用户不存在），尝试注册...`)
  const regBody = { userName: user, password: pass, name: '导入员', phone: '18800001111' }
  const r2 = await httpJson(regUrl, 'POST', regBody)
  if (r2?.data?.code === 200 && r2?.data?.data?.token) return r2.data.data.token
  // 若注册未返回token，再尝试登录一次
  const r3 = await httpJson(loginUrl, 'POST', loginBody)
  if (r3?.data?.code === 200 && r3?.data?.data?.token) return r3.data.data.token
  throw new Error(`注册/登录失败: ${r2?.data?.msg || r1?.data?.msg || r3?.data?.msg || 'unknown'}`)
}

async function resolveStoreIdIfNeeded(serverUrl, token, storeId, storeName) {
  if (typeof storeId === 'number' && storeId > 0) return storeId
  if (!storeName) throw new Error('未提供 --store-id 或 --store-name')
  const url = new URL('/api/customer/store-options', serverUrl).toString()
  const r = await httpJson(url, 'GET', null, token)
  const list = Array.isArray(r?.data?.data) ? r.data.data : []
  const match = list.find((x) => String(x.name).trim() === String(storeName).trim())
  if (!match) throw new Error(`找不到门店：${storeName}`)
  return Number(match.id)
}

async function fetchChannelOptions(serverUrl, token) {
  const url = new URL('/api/channel/options', serverUrl).toString()
  const r = await httpJson(url, 'GET', null, token)
  const data = r?.data?.data || {}
  return {
    level2Map: data.level2Map || {},
    metaByLevel1: data.metaByLevel1 || {},
  }
}

// Excel 解析与字段检测（复用 import-clues.mjs 的核心思想，简化实现）
function ensureString(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number') return String(v).trim()
  return String(v).trim()
}
function ensureDigits(v) {
  const s = ensureString(v).replace(/\D+/g, '')
  return s
}
function toBoolLoose(v) {
  const s = ensureString(v)
  if (!s) return false
  const yes = ['是', '有', 'Y', 'YES', 'TRUE', '1']
  const no = ['否', '没有', 'N', 'NO', 'FALSE', '0']
  if (yes.includes(s.toUpperCase())) return true
  if (no.includes(s.toUpperCase())) return false
  return false
}
function normalizeDateYYYYMMDD(v, yearDefault) {
  if (v instanceof Date) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = ensureString(v)
  if (!s) return ''
  const datePart = s.split(/\s|T/)[0]
  // 统一分隔符为连字符，便于后续匹配
  const norm = datePart.replace(/年|\.|\//g, '-').replace(/月/g, '-').replace(/日/g, '')
  // 支持 MM/DD/YY 形式（xlsx raw:false 常见）
  const m2 = norm.match(/^(\d{1,2})\D(\d{1,2})\D(\d{2,4})$/)
  if (m2) {
    let y = m2[3]
    if (y.length === 2) y = '20' + y
    const mm = String(m2[1]).padStart(2, '0')
    const dd = String(m2[2]).padStart(2, '0')
    return `${y}-${mm}-${dd}`
  }
  // 支持中文日期：9月3日、10月12日（无年份时使用默认年）
  const mZh = norm.match(/^(\d{1,2})\s*月\s*(\d{1,2})\s*日$/)
  if (mZh) {
    const y = String(yearDefault || new Date().getFullYear())
    const mm = String(mZh[1]).padStart(2, '0')
    const dd = String(mZh[2]).padStart(2, '0')
    return `${y}-${mm}-${dd}`
  }
  // 支持 2024/11/01、2024-11-01、20241101
  const m = norm.match(/(\d{4})\D?(\d{1,2})\D?(\d{1,2})/)
  if (!m) return ''
  const y = m[1]
  const mm = String(m[2]).padStart(2, '0')
  const dd = String(m[3]).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}
function normalizeTimeHHMMSS(v) {
  const s = ensureString(v)
  if (!s) return ''
  const m = s.match(/(\d{1,2})\D?(\d{1,2})(?:\D?(\d{1,2}))?/) // 09:30 或 0930 或 09:30:20
  if (!m) return ''
  const hh = String(m[1]).padStart(2, '0')
  const mm = String(m[2]).padStart(2, '0')
  const ss = String(m[3] || '00').padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}
function computeDurationMinutes(enterTime, leaveTime) {
  const et = ensureString(enterTime)
  const lt = ensureString(leaveTime)
  if (!et || !lt) return 0
  const [eh, em, es] = et.split(':').map((x) => Number(x))
  const [lh, lm, ls] = lt.split(':').map((x) => Number(x))
  const a = eh * 3600 + em * 60 + es
  const b = lh * 3600 + lm * 60 + ls
  const d = Math.max(0, b - a)
  return Math.round(d / 60)
}

function csvEscape(s) {
  const v = ensureString(s)
  if (v.includes(',') || v.includes('\n') || v.includes('"')) {
    return '"' + v.replace(/"/g, '""') + '"'
  }
  return v
}
function writeCsv(filePath, rows) {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  const header = rows.length ? Object.keys(rows[0]) : []
  const lines = []
  if (header.length) lines.push(header.join(','))
  for (const r of rows) {
    lines.push(header.map((k) => csvEscape(r[k])).join(','))
  }
  fs.writeFileSync(filePath, lines.join('\n'))
}

function detectColumns(headerRow) {
  const keys = headerRow.map((x) => ensureString(x))
  const idx = (regexArr) => {
    for (let i = 0; i < keys.length; i++) {
      for (const re of regexArr) {
        if (re.test(keys[i])) return i
      }
    }
    return -1
  }
  return {
    idxDate: idx([/日期|来访日期|到店日期/i]),
    idxEnter: idx([/进店时间|到店时间|开始时间/i]),
    idxLeave: idx([/离店时间|结束时间/i]),
    idxName: idx([/姓名|客户姓名/i]),
    idxPhone: idx([/电话|手机号|手机/i]),
    idxReceptionStatus: idx([/接待情况|接待状态/i]),
    idxSales: idx([/销售顾问|接待人|导购|顾问/i]),
    idxVisitorCount: idx([/到店人数|来访人数|人数/i]),
    idxAddWechat: idx([/是否加微|加微/i]),
    idxVisitCategory: idx([/到店分类|来访分类/i]),
    idxFocusModel: idx([/关注车型|关注车款/i]),
    idxTestDrive: idx([/试驾|是否试驾/i]),
    idxBargain: idx([/议价|是否议价/i]),
    idxDealDone: idx([/是否成交|成交情况|成交否/i]),
    idxDealModel: idx([/成交车型|成交车款/i]),
    idxStoreName: idx([/归属门店|门店/i]),
    idxChannelL1: idx([/一级渠道|渠道一级|来源一级/i]),
    idxChannelL2: idx([/二级渠道|渠道二级|来源二级/i]),
    idxContactTimes: idx([/联系次数|触达次数|接触次数/i]),
    idxOpportunityLevel: idx([/商机级别|意向级别|级别/i]),
    idxGender: idx([/性别|使用者性别/i]),
    idxAge: idx([/年龄|使用者年龄/i]),
    idxBuyExp: idx([/购车经历|是否首购|首次购买/i]),
    idxPhoneBrand: idx([/手机品牌|使用手机/i]),
    idxCurBrand: idx([/现有品牌|现用品牌/i]),
    idxCurModel: idx([/现有车型|现用车型/i]),
    idxCarAge: idx([/车龄|使用年限/i]),
    idxMileage: idx([/里程|公里数/i]),
    idxLivingArea: idx([/居住区域|居住区|住址区县/i]),
  }
}

function buildClueItem(row, cols, ctx) {
  const get = (i) => (i >= 0 ? row[i] : undefined)
  const visitDate = normalizeDateYYYYMMDD(get(cols.idxDate), ctx.yearDefault)
  const enterTime = normalizeTimeHHMMSS(get(cols.idxEnter))
  const leaveTime = normalizeTimeHHMMSS(get(cols.idxLeave))
  const receptionDuration = computeDurationMinutes(enterTime, leaveTime)
  const name = ensureString(get(cols.idxName))
  const phoneDigits = ensureDigits(get(cols.idxPhone))
  const receptionStatusStr = ensureString(get(cols.idxReceptionStatus))
  const receptionStatus = /销售/i.test(receptionStatusStr)
    ? 'sales'
    : /不需/i.test(receptionStatusStr)
      ? 'noNeed'
      : 'none'
  const salesConsultant = ensureString(get(cols.idxSales))
  const visitorCount = Number(ensureDigits(get(cols.idxVisitorCount))) || 1
  const isAddWeChat = toBoolLoose(get(cols.idxAddWechat))
  const visitCategory = ensureString(get(cols.idxVisitCategory))
  const focusModelName = ensureString(get(cols.idxFocusModel))
  const testDrive = toBoolLoose(get(cols.idxTestDrive))
  const bargaining = toBoolLoose(get(cols.idxBargain))
  const dealDone = toBoolLoose(get(cols.idxDealDone))
  const dealModelName = ensureString(get(cols.idxDealModel))
  const channelLevel1 = ensureString(get(cols.idxChannelL1))
  const channelLevel2 = ensureString(get(cols.idxChannelL2))
  const contactTimes = Number(ensureDigits(get(cols.idxContactTimes))) || 1
  const opportunityLevel = ensureString(get(cols.idxOpportunityLevel)) || 'A'
  const userGender = ensureString(get(cols.idxGender)) || '未知'
  const ageNum = Number(ensureDigits(get(cols.idxAge))) || 0
  const buyExperience = ensureString(get(cols.idxBuyExp)) || '首购'
  const userPhoneModel = ensureString(get(cols.idxPhoneBrand))
  const currentBrand = ensureString(get(cols.idxCurBrand))
  const currentModel = ensureString(get(cols.idxCurModel))
  const carAge = Number(ensureDigits(get(cols.idxCarAge))) || 0
  const mileage = Number(ensureDigits(get(cols.idxMileage))) || 0
  const livingArea = ensureString(get(cols.idxLivingArea))

  return {
    visitDate,
    enterTime,
    leaveTime,
    receptionDuration,
    customerName: name,
    customerPhone: phoneDigits,
    receptionStatus,
    salesConsultant,
    visitorCount,
    isAddWeChat,
    visitCategory,
    focusModelName,
    testDrive,
    bargaining,
    dealDone,
    dealModelName,
    storeId: ctx.storeId,
    channelLevel1,
    channelLevel2,
    contactTimes,
    opportunityLevel,
    businessSource: '',
    channelCategory: '',
    convertOrRetentionModel: '',
    referrer: '',
    userGender,
    userAge: ageNum,
    buyExperience,
    userPhoneModel,
    currentBrand,
    currentModel,
    carAge,
    mileage,
    livingArea,
  }
}

function normalizeClueItem(item, channelMetaByL1) {
  const l1 = ensureString(item.channelLevel1)
  const meta = channelMetaByL1?.[l1]
  if (meta) {
    item.businessSource = meta.businessSource || item.businessSource
    item.channelCategory = meta.channelCategory || item.channelCategory
  }
  const l1str = l1 || ''
  if (!ALLOWED_PRIMARY_REFERRER.includes(l1str)) {
    item.convertOrRetentionModel = ''
  }
  if (!ALLOWED_REFERRER.includes(l1str)) {
    item.referrer = ''
  }
  if (String(item.buyExperience) === '首购') {
    item.currentBrand = ''
    item.currentModel = ''
    item.carAge = 0
    item.mileage = 0
  }
  // 若成交且成交车型为空，则自动回填为关注车型
  if (item.dealDone && !ensureString(item.dealModelName) && ensureString(item.focusModelName)) {
    item.dealModelName = ensureString(item.focusModelName)
  }
  item.receptionDuration = computeDurationMinutes(item.enterTime, item.leaveTime)
  return item
}

function validateClueItem(item, level2Map) {
  const reasons = []
  const required = (cond, msg) => {
    if (!cond) reasons.push(msg)
  }
  required(!!item.visitDate, '到店日期必填')
  required(!!item.enterTime, '进店时间必填')
  required(!!item.leaveTime, '离店时间必填')
  if (item.enterTime && item.leaveTime) {
    const d = computeDurationMinutes(item.enterTime, item.leaveTime)
    if (d < 0) reasons.push('离店时间不能早于进店时间')
  }
  required(!!item.customerName, '客户姓名必填')
  required(/^\d{11}$/.test(String(item.customerPhone)), '请输入11位手机号')
  if (String(item.receptionStatus) === 'sales') {
    required(!!ensureString(item.salesConsultant), '销售接待时销售顾问必填')
  }
  required(typeof item.storeId === 'number' && item.storeId > 0, '归属门店必选')
  required(!!ensureString(item.channelLevel1), '一级渠道必选')
  const l1 = ensureString(item.channelLevel1)
  const l2opts = level2Map?.[l1]
  if (Array.isArray(l2opts) && l2opts.length > 0) {
    required(!!ensureString(item.channelLevel2), '二级渠道必选')
  }
  if (item.dealDone) {
    required(!!ensureString(item.dealModelName), '成交车型在成交时必填')
  }
  required(typeof item.userAge === 'number' && item.userAge >= 18, '年龄必须 >= 18 岁')
  required(typeof item.contactTimes === 'number' && item.contactTimes >= 1, '联系次数必须 >= 1')
  return reasons
}

function guessYearDefault(dataRows, cols) {
  // 扫描前200行，寻找带年份的日期
  const N = Math.min(200, dataRows.length)
  for (let i = 0; i < N; i++) {
    const v = cols.idxDate >= 0 ? dataRows[i][cols.idxDate] : undefined
    if (!v && v !== 0) continue
    if (v instanceof Date) return v.getFullYear()
    const s = ensureString(v)
    // MM/DD/YY 或 MM/DD/YYYY
    const m2 = s.match(/^(\d{1,2})\D(\d{1,2})\D(\d{2,4})/) // 兼容后续带时间
    if (m2) {
      const y = m2[3]
      return y.length === 2 ? Number('20' + y) : Number(y)
    }
    const m = s.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/)
    if (m) return Number(m[1])
  }
  return new Date().getFullYear()
}

function computeAverageAge(dataRows, cols) {
  if (cols.idxAge < 0) return 18
  const ages = []
  for (const r of dataRows) {
    const raw = r[cols.idxAge]
    const n = Number(ensureDigits(raw))
    if (!Number.isNaN(n) && n > 0) ages.push(n)
  }
  if (!ages.length) return 18
  const avg = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length)
  return Math.max(18, avg)
}

async function main() {
  const opts = parseArgs()
  const inputPath = opts.input
  if (!fs.existsSync(inputPath)) {
    err(`找不到 Excel 文件：${inputPath}`)
    process.exit(1)
  }

  const ready = await ensureServerReady(opts.serverUrl)
  if (!ready) {
    err('后端未就绪，请先确保 API 服务在线')
    process.exit(1)
  }
  const token = await loginOrRegister(opts.serverUrl, opts.user, opts.pass)
  info('登录成功，token已获取')

  const storeId = await resolveStoreIdIfNeeded(opts.serverUrl, token, opts.storeId, opts.storeName)
  info(`归属门店ID：${storeId}`)

  const { level2Map, metaByLevel1 } = await fetchChannelOptions(opts.serverUrl, token)

  // 读取 Excel
  const wb = xlsx.readFile(inputPath, { cellDates: true })
  const sheetName = opts.sheet || wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  if (!ws) {
    err(`找不到工作表：${sheetName}`)
    process.exit(1)
  }
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false })
  if (!rows.length) {
    err('工作表为空')
    process.exit(1)
  }
  function findHeaderRowIndex(rows) {
    const patterns = [
      /日期|来访日期|到店日期/i,
      /姓名|客户姓名/i,
      /电话|手机号|手机/i,
      /一级渠道|渠道一级|来源一级/i,
    ]
    const maxScan = Math.min(rows.length, 10)
    for (let i = 0; i < maxScan; i++) {
      const r = (rows[i] || []).map((x) => ensureString(x))
      let hit = 0
      for (const p of patterns) {
        if (r.some((c) => p.test(c))) hit++
      }
      if (hit >= 3) return i
    }
    return 0
  }
  const headerRowIndex = findHeaderRowIndex(rows)
  const header = rows[headerRowIndex]
  const cols = detectColumns(header)
  const dataRows = rows.slice(headerRowIndex + 1)
  const yearDefault = guessYearDefault(dataRows, cols)
  const averageAge = computeAverageAge(dataRows, cols)
  const limit = typeof opts.limit === 'number' && opts.limit > 0 ? Math.min(opts.limit, dataRows.length) : dataRows.length

  const invalid = []
  let okCount = 0
  let failCount = 0

  for (let i = 0; i < limit; i++) {
    const row = dataRows[i]
    try {
      let item = buildClueItem(row, cols, { storeId, yearDefault })
      if (!(typeof item.userAge === 'number') || item.userAge <= 0) {
        item.userAge = averageAge
      }
      item = normalizeClueItem(item, metaByLevel1)
      const reasons = validateClueItem(item, level2Map)
      if (reasons.length) {
        invalid.push({ 行号: i + 2, 姓名: item.customerName, 手机: item.customerPhone, 原因: reasons.join('; ') })
        continue
      }
      if (opts.dryRun) {
        okCount++
        continue
      }
      const saveUrl = new URL('/api/clue/save', opts.serverUrl).toString()
      const r = await httpJson(saveUrl, 'POST', item, token)
      if (!(r?.data?.code === 200)) throw new Error(r?.data?.msg || `保存失败，HTTP ${r?.status}`)
      okCount++
    } catch (e) {
      failCount++
      invalid.push({ 行号: i + 2, 姓名: ensureString(row[cols.idxName]), 手机: ensureDigits(row[cols.idxPhone]), 原因: e.message })
    }
  }

  if (invalid.length) {
    writeCsv(opts.invalidCsv, invalid)
    warn(`已输出不满足前端规则或失败的线索到：${opts.invalidCsv}`)
  }
  info(`导入完成。成功: ${okCount}，失败/不合规: ${invalid.length}`)
}

main().catch((e) => {
  err(e.stack || e.message)
  process.exit(1)
})