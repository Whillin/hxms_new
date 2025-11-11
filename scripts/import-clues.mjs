#!/usr/bin/env node
// 批量导入线索：读取Excel，按系统字段映射调用 /api/clue/save
// 复用后端规范化逻辑以确保客户/渠道/车型等关联正常
// 用法示例：
// node scripts/import-clues.mjs "C:/Users/Administrator/Desktop/客流表.xlsx" --sheet Sheet1 --store-id 101 --server-url http://127.0.0.1:3002 --user importer --pass 123456

import fs from 'fs'
import path from 'path'
import xlsx from 'xlsx'

function log(...args) { console.log('[import-clues]', ...args) }
function err(...args) { console.error('[import-clues]', ...args) }

function parseArgs() {
  const argv = process.argv.slice(2)
  if (argv.length === 0) {
    err('缺少 Excel 文件路径参数')
    err('示例：node scripts/import-clues.mjs "C:/Users/Administrator/Desktop/客流表.xlsx" --sheet Sheet1 --store-id 101')
    process.exit(2)
  }
  const input = argv[0]
  let sheetName = null
  const opts = {
    serverUrl: process.env.IMPORT_SERVER_URL || 'http://127.0.0.1:3002',
    user: process.env.IMPORT_USER || 'importer',
    pass: process.env.IMPORT_PASS || '123456',
    registerIfMissing: true,
    storeId: null,
    storeName: null,
    yearDefault: new Date().getFullYear(),
    dryRun: false,
    limit: 0
  }
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--sheet') { sheetName = argv[++i]; continue }
    if (a === '--server-url') { opts.serverUrl = argv[++i]; continue }
    if (a === '--user') { opts.user = argv[++i]; continue }
    if (a === '--pass') { opts.pass = argv[++i]; continue }
    if (a === '--no-register') { opts.registerIfMissing = false; continue }
    if (a === '--store-id') { opts.storeId = Number(argv[++i]); continue }
    if (a === '--store-name') { opts.storeName = argv[++i]; continue }
    if (a === '--year') { opts.yearDefault = Number(argv[++i]); continue }
    if (a === '--dry-run') { opts.dryRun = true; continue }
    if (a === '--limit') { opts.limit = Number(argv[++i]); continue }
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
  // 支持两位年份：MM-DD-YY（如 8-30-25 -> 2025-08-30）
  const mShort = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/)
  if (mShort) {
    const mm = String(mShort[1]).padStart(2, '0')
    const dd = String(mShort[2]).padStart(2, '0')
    const y = 2000 + Number(mShort[3])
    return `${y}-${mm}-${dd}`
  }
  // 若仅有 MM-DD 或 M-D，则补年
  if (/^\d{1,2}-\d{1,2}$/.test(s)) return `${yearDefault}-${s.split('-').map((p)=>p.padStart(2,'0')).join('-')}`
  // 若为 YYYY-M-D 也兼容
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    const y = m[1]
    const mm = String(m[2]).padStart(2, '0')
    const dd = String(m[3]).padStart(2, '0')
    return `${y}-${mm}-${dd}`
  }
  return s
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
    '北京市': ['北京'], '上海市': ['上海'], '天津市': ['天津']
  }

  const strip = (p) => p.replace(/(省|市|自治区|特别行政区|壮族自治区|回族自治区|维吾尔自治区)$/g, '')
  for (const [prov, cities] of Object.entries(provCities)) {
    const provWord = strip(prov)
    const hasProv = new RegExp(provWord).test(s) || new RegExp(prov).test(s)
    const cityHit = cities.find((c) => new RegExp(`(?:^|-)${c}(?:市)?`).test(s))
    if (hasProv || cityHit) {
      const cityFull = cityHit ? `${cityHit}市` : undefined
      let detail = s
      detail = detail.replace(new RegExp(`^(${prov}|${provWord})-?`), '')
      if (cityFull) detail = detail.replace(new RegExp(`^(${cityHit}|${cityFull})-?`), '')
      const prefix = cityFull ? `${prov}-${cityFull}` : `${prov}`
      return detail ? `${prefix}-${detail}` : prefix
    }
  }
  return s
}

function csvEscape(v) {
  const s = v == null ? '' : String(v)
  const needsQuote = /[",\n]/.test(s)
  const escaped = s.replace(/"/g, '""')
  return needsQuote ? `"${escaped}"` : escaped
}

function writeCsv(filePath, headers, rows) {
  const bom = '\uFEFF'
  const lines = [headers.map((h) => csvEscape(h)).join(',')]
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(','))
  }
  fs.writeFileSync(filePath, bom + lines.join('\n'), 'utf8')
}

function computeSkipReason(row, cols, ctx) {
  const phoneDigits = ensureDigits(row[cols.phoneKey])
  const email = ensureString(row['邮箱'] || row['电子邮件'] || row['email'] || '')
  const date = normalizeDateYYYYMMDD(row[cols.dateKey], ctx.yearDefault)
  const hasValidPhone = phoneDigits.length >= 7 && (isLikelyCnMobile(phoneDigits) || phoneDigits.length >= 7)
  const hasValidEmail = isValidEmail(email)
  if (!hasValidPhone && !hasValidEmail) return '无有效手机号或邮箱'
  if (!date) return '缺少有效日期'
  return '未知原因（字段不匹配或空值）'
}

function detectColumns(headers) {
  const has = (h, pats) => pats.some((p) => new RegExp(p, 'i').test(h))
  const find = (pats) => headers.find((h) => has(h, pats))
  return {
    // 基础
    dateKey: find(['到店日期', '日期', '来访日期', 'visit']),
    nameKey: find(['客户姓名', '姓名', '顾客姓名', '联系人', 'name']),
    phoneKey: find(['手机号', '手机', '电话', '联系电话', '联系方式', 'mobile', 'phone']),
    // 接待/顾问
    receptionKey: find(['接待情况', '是否接待', '接待']),
    consultantKey: find(['销售顾问', '顾问', '接待人', '接待人员']),
    visitorCountKey: find(['到店人数', '来店人数']),
    durationKey: find(['接待时长', '时长']),
    enterTimeKey: find(['进店时间', '到店时间']),
    leaveTimeKey: find(['离店时间']),
    // 加微/分类
    addWeChatKey: find(['是否加微', '加微', '加微信', '加V']),
    visitCatKey: find(['到店分类', '首次', '再次']),
    // 渠道/来源
    categoryKey: find(['渠道分类', '渠道', '线上线下', 'channel']),
    sourceKey: find(['业务来源', '来源', '线索来源', 'source']),
    level1Key: find(['渠道一级', '来源一级']),
    level2Key: find(['渠道二级', '来源二级']),
    // 车型
    focusModelKey: find(['关注车型', '意向车型', '车型关注']),
    dealModelKey: find(['成交车型', '实际成交车型']),
    // 商机与画像
    levelKey: find(['商机级别', '商机', '级别']),
    genderKey: find(['性别']),
    ageKey: find(['年龄']),
    expKey: find(['购车经历', '是否首购', '首购', '换购', '增购']),
    phoneModelKey: find(['手机品牌', '手机型号']),
    curBrandKey: find(['现有品牌', '现用品牌', '持有品牌']),
    curModelKey: find(['现有车型', '持有车型']),
    carAgeKey: find(['车龄']),
    mileageKey: find(['里程', '公里', 'km']),
    areaKey: find(['居住区域', '地区', '住址']),
    contactTimesKey: find(['联系次数', '跟进次数'])
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

async function httpJson(url, method, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let data = null
  try { data = await res.json() } catch { data = null }
  return { status: res.status, data }
}

async function ensureServerReady(base) {
  try {
    const { status, data } = await httpJson(`${base}/api/health/ready`, 'GET')
    return status === 200 && Number(data?.data?.uptime || 0) > 0
  } catch { return false }
}

async function loginOrRegister(base, user, pass, registerIfMissing) {
  const loginBody = { userName: user, password: pass }
  const r1 = await httpJson(`${base}/api/auth/login`, 'POST', loginBody)
  if (r1?.data?.code === 200 && r1?.data?.data?.token) return r1.data.data.token
  if (!registerIfMissing) throw new Error('登录失败，且未启用自动注册')
  const regBody = { userName: user, password: pass, name: '导入员', phone: '18800001111' }
  const r2 = await httpJson(`${base}/api/auth/register`, 'POST', regBody)
  if (r2?.data?.code === 200 && r2?.data?.data?.token) return r2.data.data.token
  throw new Error(`注册/登录失败: ${r2?.data?.msg || r1?.data?.msg || 'unknown'}`)
}

async function resolveStoreIdIfNeeded(storeId, storeName, base, token) {
  if (typeof storeId === 'number' && storeId > 0) return storeId
  if (!storeName) throw new Error('请提供 --store-id 或 --store-name')
  // 复用客户模块的门店选项接口
  const r = await httpJson(`${base}/api/customer/store-options`, 'GET', null, token)
  const list = Array.isArray(r?.data?.data) ? r.data.data : []
  const hit = list.find((x) => String(x.name).trim() === String(storeName).trim())
  if (!hit) throw new Error(`未找到门店：${storeName}`)
  return Number(hit.id)
}

async function main() {
  const { input, sheetName, opts } = parseArgs()
  if (!fs.existsSync(input)) {
    err('文件不存在：', input)
    process.exit(2)
  }

  log('检查后端服务就绪：', opts.serverUrl)
  const ready = await ensureServerReady(opts.serverUrl)
  if (!ready) {
    err('后端未就绪，请先启动 server（端口及Redis见 server/.env）')
    process.exit(2)
  }

  log('登录/注册以获取token…')
  const token = await loginOrRegister(opts.serverUrl, opts.user, opts.pass, opts.registerIfMissing)
  log('token获取成功')

  log('解析Excel：', input)
  const wb = xlsx.readFile(input, { cellDates: true })
  const targetSheet = sheetName || wb.SheetNames[0]
  const ws = wb.Sheets[targetSheet]
  if (!ws) {
    err('找不到工作表：', targetSheet)
    process.exit(2)
  }
  const rows = xlsx.utils.sheet_to_json(ws, { defval: '', raw: false })
  if (rows.length === 0) {
    err('工作表为空')
    process.exit(2)
  }
  // 收集表头
  const headersSet = new Set()
  rows.forEach((r) => Object.keys(r).forEach((k) => headersSet.add(k)))
  const headers = Array.from(headersSet)
  const cols = detectColumns(headers)
  log('字段识别：', cols)

  // 解析storeId
  const storeId = await resolveStoreIdIfNeeded(opts.storeId, opts.storeName, opts.serverUrl, token)
  const ctx = { storeId, yearDefault: opts.yearDefault, defaultLevel: 'B' }

  let total = 0
  let prepared = 0
  let submitted = 0
  let skipped = 0
  let failed = 0

  const failedRows = []
  const skippedRows = []

  for (const row of rows) {
    if (opts.limit && total >= opts.limit) break
    total++
    const item = buildClueItem(row, cols, ctx)
    if (!item) {
      skipped++
      const reason = computeSkipReason(row, cols, ctx)
      skippedRows.push({
        行号: total,
        工作表: targetSheet,
        门店ID: storeId,
        到店日期: ensureString(row[cols.dateKey]) || '',
        客户姓名: ensureString(row[cols.nameKey]) || '',
        客户电话: ensureString(row[cols.phoneKey]) || '',
        原因: reason
      })
      continue
    }
    prepared++
    if (opts.dryRun) continue
    const { status, data } = await httpJson(`${opts.serverUrl}/api/clue/save`, 'POST', item, token)
    if (data?.code === 200 && data?.data === true) submitted++
    else {
      failed++
      const msg = data?.msg || data?.message || `HTTP ${status}`
      err('提交失败：', msg)
      failedRows.push({
        行号: total,
        工作表: targetSheet,
        门店ID: storeId,
        到店日期: ensureString(row[cols.dateKey]) || '',
        客户姓名: ensureString(row[cols.nameKey]) || '',
        客户电话: ensureString(row[cols.phoneKey]) || '',
        状态码: String(status || ''),
        错误: String(msg || '')
      })
    }
    // 简单节流，避免过快请求
    await new Promise((r) => setTimeout(r, 50))
  }

  const report = {
    input,
    sheet: targetSheet,
    storeId,
    total,
    prepared,
    submitted,
    skipped,
    failed,
    dryRun: opts.dryRun,
    failedRowsCount: failedRows.length,
    skippedRowsCount: skippedRows.length
  }
  log('导入完成：', report)
  try {
    const outDir = path.join(path.dirname(input), 'import-output')
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, 'import-report.json'), JSON.stringify(report, null, 2), 'utf8')
    log('已生成导入报告：', path.join(outDir, 'import-report.json'))
    if (failedRows.length) {
      const failedCsv = path.join(outDir, 'failed-rows.csv')
      writeCsv(failedCsv, ['行号', '工作表', '门店ID', '到店日期', '客户姓名', '客户电话', '状态码', '错误'], failedRows)
      log('已生成失败明细CSV：', failedCsv)
    }
    if (skippedRows.length) {
      const skippedCsv = path.join(outDir, 'skipped-rows.csv')
      writeCsv(skippedCsv, ['行号', '工作表', '门店ID', '到店日期', '客户姓名', '客户电话', '原因'], skippedRows)
      log('已生成跳过明细CSV：', skippedCsv)
    }
  } catch {}
}

main().catch((e) => {
  err('导入过程异常：', e?.message || e)
  process.exit(1)
})