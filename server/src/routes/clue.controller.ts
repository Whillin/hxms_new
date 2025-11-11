import { Body, Controller, Get, Post, Query, Req, UseGuards, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, Between, In } from 'typeorm'
import { JwtGuard } from '../auth/jwt.guard'
import { Clue } from '../clues/clue.entity'
import { DataScopeService } from '../common/data-scope.service'
import { Department } from '../departments/department.entity'
import { UserService } from '../users/user.service'
import { Customer } from '../customers/customer.entity'
import { Channel } from '../channels/channel.entity'
import { ProductModel } from '../products/product-model.entity'
import { Employee } from '../employees/employee.entity'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { FeatureFlagsService } from '../common/feature-flags.service'

@Controller('api/clue')
export class ClueController {
  constructor(
    @InjectRepository(Clue) private readonly repo: Repository<Clue>,
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Channel) private readonly channelRepo: Repository<Channel>,
    @InjectRepository(ProductModel) private readonly productModelRepo: Repository<ProductModel>,
    @InjectRepository(Employee) private readonly empRepo: Repository<Employee>,
    @Inject(DataScopeService) private readonly dataScopeService: DataScopeService,
    @Inject(UserService) private readonly userService: UserService,
    @InjectQueue('clue-processing') private clueQueue: Queue,
    @Inject(FeatureFlagsService) private readonly features: FeatureFlagsService
  ) {}

  // === 规范化辅助 ===
  private normalizeDateYYYYMMDD(v: any): string | undefined {
    if (!v) return undefined
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
    // YYYY-M-D
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (m) {
      const y = m[1]
      const mm = String(m[2]).padStart(2, '0')
      const dd = String(m[3]).padStart(2, '0')
      return `${y}-${mm}-${dd}`
    }
    // MM-D 或 M-D（无法确定年份则原样返回）
    return s
  }

  private normalizeTimeHHMMSS(v: any): string | undefined {
    if (!v && v !== 0) return undefined
    let s = String(v).trim()
    if (!s) return undefined
    // 提取最后的时间片段
    const m = s.match(/(\d{1,2}:\d{1,2}(?::\d{1,2})?)$/)
    const seg = m ? m[1] : s.replace(/[^0-9:]/g, '')
    if (!seg) return undefined
    const parts = seg.split(':')
    const hh = String(parts[0] || '0').padStart(2, '0')
    const mm = String(parts[1] || '0').padStart(2, '0')
    const ss = String(parts[2] || '0').padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  private computeDurationMinutes(enter?: string, leave?: string): number | undefined {
    if (!enter || !leave) return undefined
    const [eh, em, es] = enter.split(':').map((x) => Number(x) || 0)
    const [lh, lm, ls] = leave.split(':').map((x) => Number(x) || 0)
    const start = eh * 60 + em + es / 60
    const end = lh * 60 + lm + ls / 60
    const diff = Math.round(end - start)
    return diff > 0 ? diff : undefined
  }

  private computeChannelMetaByLevel1(l1?: string): { category?: string; source?: string } {
    const L1 = String(l1 || '').trim()
    if (!L1) return {}
    const category = ['DCC/ADC到店', '新媒体开发'].includes(L1) ? '线上' : '线下'
    const source = ['展厅到店', 'DCC/ADC到店', '车展外展'].includes(L1) ? '自然到店' : '主动开发'
    return { category, source }
  }

  private normalizeLivingAreaPreferSCOrCQ(v?: string): string | undefined {
    let s = String(v || '').trim()
    if (!s) return undefined
    // 统一分隔符，去除空白，提升匹配稳定性
    s = s.replace(/[，、,]/g, '-').replace(/\s+/g, '')

    const provCities: Record<string, string[]> = {
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
      '安徽省': ['合肥', '芜湖', '蚌埠', '淮南', '马鞍山', '淮北', '铜陵', '安庆', '黄山', '滁州', '阜阳', '宿州', '六安', '亳州', '池州', '宣城'],
      '山东省': ['济南', '青岛', '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁', '泰安', '威海', '日照', '临沂', '德州', '聊城', '滨州', '菏泽'],
      '河南省': ['郑州', '开封', '洛阳', '平顶山', '安阳', '鹤壁', '新乡', '焦作', '濮阳', '许昌', '漯河', '三门峡', '南阳', '商丘', '信阳', '周口', '驻马店'],
      '河北省': ['石家庄', '唐山', '秦皇岛', '邯郸', '邢台', '保定', '张家口', '承德', '沧州', '廊坊', '衡水'],
      '山西省': ['太原', '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城', '忻州', '临汾', '吕梁'],
      '陕西省': ['西安', '铜川', '宝鸡', '咸阳', '渭南', '延安', '汉中', '榆林', '安康', '商洛'],
      '内蒙古自治区': ['呼和浩特', '包头', '乌海', '赤峰', '通辽', '鄂尔多斯', '呼伦贝尔', '巴彦淖尔', '乌兰察布', '兴安', '锡林郭勒', '阿拉善'],
      '黑龙江省': ['哈尔滨', '齐齐哈尔', '牡丹江', '佳木斯', '大庆', '鸡西', '鹤岗', '双鸭山', '伊春', '七台河', '黑河', '绥化', '大兴安岭'],
      '吉林省': ['长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城', '延边'],
      '辽宁省': ['沈阳', '大连', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口', '阜新', '辽阳', '盘锦', '铁岭', '朝阳', '葫芦岛'],
      '甘肃省': ['兰州', '嘉峪关', '金昌', '白银', '天水', '武威', '张掖', '平凉', '酒泉', '庆阳', '定西', '陇南', '临夏', '甘南'],
      '宁夏回族自治区': ['银川', '石嘴山', '吴忠', '固原', '中卫'],
      '青海省': ['西宁', '海东', '海北', '黄南', '海南', '果洛', '玉树', '海西'],
      '新疆维吾尔自治区': ['乌鲁木齐', '克拉玛依', '吐鲁番', '哈密', '昌吉', '博尔塔拉', '巴音郭楞', '阿克苏', '喀什', '和田', '伊犁', '塔城', '阿勒泰'],
      '西藏自治区': ['拉萨', '昌都', '山南', '日喀则', '那曲', '阿里', '林芝'],
      '海南省': ['海口', '三亚', '三沙', '儋州'],
      '北京市': ['北京'],
      '上海市': ['上海'],
      '天津市': ['天津']
    }

    const strip = (p: string) => p.replace(/(省|市|自治区|特别行政区|壮族自治区|回族自治区|维吾尔自治区)$/g, '')

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

  private modelNameCandidates(raw?: string): string[] {
    const s = String(raw || '').trim()
    if (!s) return []
    const u = s.toUpperCase()
    const aliases: Record<string, string[]> = {
      'P7+': ['P7+', 'P7 PLUS', 'P7PLUS', 'P7 PLUS'],
      'P7I': ['P7I', 'P7 I', 'P7-I'],
      'G7': ['G7', '小鹏G7'],
      'G9': ['G9', '小鹏G9'],
      'M03': ['M03', 'MONA M03', 'XPENG M03', '小鹏M03']
    }
    if (aliases[u]) return [s, ...aliases[u]]
    return [s]
  }

  private async resolveModelIdByName(name?: string): Promise<number | undefined> {
    const candidates = this.modelNameCandidates(name)
    if (!candidates.length) return undefined
    // 直接精确匹配
    const hit = await this.productModelRepo.findOne({ where: { name: In(candidates) } })
    if (hit) return hit.id
    // 尝试模糊匹配（大小写无关）
    for (const c of candidates) {
      const row = await this.productModelRepo
        .createQueryBuilder('m')
        .where('LOWER(m.name) LIKE LOWER(:p)', { p: `%${c.toLowerCase()}%` })
        .getOne()
      if (row) return row.id
    }
    return undefined
  }

  @UseGuards(JwtGuard)
  @Get('list')
  async list(@Req() req: any, @Query() query: any) {
    const current = Math.max(1, Number(query.current || 1))
    const size = Math.max(1, Math.min(100, Number(query.size || 10)))

    const scope = await this.dataScopeService.getScope(req.user)

    // 数据范围过滤
    const where: any = {}
    switch (scope.level) {
      case 'all':
        break
      case 'self':
        if (typeof scope.employeeId === 'number') where.createdBy = scope.employeeId
        break
      case 'department':
        if (typeof scope.departmentId === 'number') where.departmentId = scope.departmentId
        if (Array.isArray(scope.storeIds) && scope.storeIds.length)
          where.storeId = In(scope.storeIds)
        break
      case 'store':
        where.storeId = In(scope.storeIds || [])
        break
      case 'region':
        if (typeof scope.regionId === 'number') where.regionId = scope.regionId
        break
      case 'brand':
        if (typeof scope.brandId === 'number') where.brandId = scope.brandId
        break
      default:
        break
    }

    // 搜索过滤
    if (query.customerName) where.customerName = Like(`%${String(query.customerName)}%`)
    if (query.customerPhone) where.customerPhone = Like(`%${String(query.customerPhone)}%`)
    if (query.opportunityLevel) where.opportunityLevel = String(query.opportunityLevel)
    if (query.dealDone === 'true') where.dealDone = true
    if (query.dealDone === 'false') where.dealDone = false
    if (Array.isArray(query.daterange) && query.daterange.length === 2) {
      const [start, end] = query.daterange
      where.visitDate = Between(String(start), String(end))
    }

    const [records, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (current - 1) * size,
      take: size
    })

    const payload = {
      records: records.map((r) => ({
        id: r.id,
        visitDate: r.visitDate,
        enterTime: r.enterTime || '',
        leaveTime: r.leaveTime || '',
        receptionDuration: r.receptionDuration || 0,
        visitorCount: r.visitorCount || 1,
        receptionStatus: r.receptionStatus || 'sales',
        salesConsultant: r.salesConsultant || '',
        customerName: r.customerName,
        visitPurpose: r.visitPurpose || '看车',
        isAddWeChat:
          typeof (r as any).isAddWeChat === 'boolean'
            ? !!(r as any).isAddWeChat
            : !!(r as any).isReserved,
        visitCategory: r.visitCategory || '首次',
        customerPhone: r.customerPhone,
        focusModelId: r.focusModelId,
        focusModelName: r.focusModelName,
        testDrive: !!r.testDrive,
        bargaining: !!r.bargaining,
        dealDone: !!r.dealDone,
        dealModelId: r.dealModelId,
        dealModelName: r.dealModelName,
        businessSource: r.businessSource,
        channelCategory: r.channelCategory,
        channelLevel1: r.channelLevel1,
        channelLevel2: r.channelLevel2,
        convertOrRetentionModel: r.convertOrRetentionModel,
        referrer: r.referrer,
        contactTimes: r.contactTimes,
        opportunityLevel: r.opportunityLevel,
        userGender: r.userGender,
        userAge: r.userAge,
        buyExperience: r.buyExperience,
        userPhoneModel: r.userPhoneModel,
        currentBrand: r.currentBrand,
        currentModel: r.currentModel,
        carAge: r.carAge,
        mileage: Number(r.mileage || 0),
        livingArea: r.livingArea || '',
        brandId: r.brandId,
        regionId: r.regionId,
        storeId: r.storeId,
        departmentId: r.departmentId,
        createdBy: r.createdBy,
        createdAt: (r.createdAt as any)?.toISOString?.() || ''
      })),
      total,
      current,
      size
    }

    return { code: 200, msg: 'ok', data: payload }
  }

  @UseGuards(JwtGuard)
  @Post('save')
  async save(@Req() req: any, @Body() body: any) {
    // 当功能开关禁用或队列不可用时，回退为直写保存
    try {
      if (this.features.isEnabled('QUEUE_SAVE_CLUE', true)) {
        await this.clueQueue.add('save-clue', { user: req.user, body })
        return { code: 200, msg: '线索保存任务已提交到后台处理', data: true }
      }
      // 功能开关关闭时直接保存
      return await this.saveDirect(req, body)
    } catch (err) {
      console.error('[ClueController.save] queue add failed, fallback to direct save:', err)
      return await this.saveDirect(req, body)
    }
  }

  @UseGuards(JwtGuard)
  @Post('delete')
  async delete(@Req() req: any, @Body() body: any) {
    const id = Number(body.id)
    if (!id) return { code: 400, msg: '缺少ID', data: false }

    const scope = await this.dataScopeService.getScope(req.user)
    const record = await this.repo.findOne({ where: { id } })
    if (!record) return { code: 404, msg: '线索不存在', data: false }

    const userId = Number(req?.user?.sub)
    const user = userId ? await this.userService.findById(userId) : null
    const employeeId = user?.employeeId

    if (!this.isInScope(record, scope, employeeId)) {
      return { code: 403, msg: '无权删除该线索', data: false }
    }

    await this.repo.delete(id)
    return { code: 200, msg: '删除成功', data: true }
  }

  // === 辅助方法 ===
  private async findAncestors(
    id: number
  ): Promise<{ storeId?: number; regionId?: number; brandId?: number }> {
    const getById = async (deptId: number) => await this.deptRepo.findOne({ where: { id: deptId } })
    let regionId: number | undefined
    let brandId: number | undefined
    let cur = await getById(id)
    const guard = new Set<number>()
    while (cur && typeof cur.parentId === 'number' && !guard.has(cur.parentId!)) {
      guard.add(cur.parentId!)
      const p = await getById(cur.parentId!)
      if (!p) break
      if (p.type === 'region') regionId = p.id
      if (p.type === 'brand') brandId = p.id
      cur = p
    }
    return { storeId: id, regionId, brandId }
  }

  private async isStoreInRegion(storeId: number, regionId: number): Promise<boolean> {
    const { regionId: r } = await this.findAncestors(storeId)
    return r === regionId
  }
  private async isStoreInBrand(storeId: number, brandId: number): Promise<boolean> {
    const { brandId: b } = await this.findAncestors(storeId)
    return b === brandId
  }
  private isInScope(record: Clue, scope: any, employeeId?: number | null): boolean {
    switch (scope.level) {
      case 'all':
        return true
      case 'self':
        return typeof employeeId === 'number' && record.createdBy === employeeId
      case 'department':
        return (
          (typeof scope.departmentId === 'number' && record.departmentId === scope.departmentId) ||
          (Array.isArray(scope.storeIds) && scope.storeIds.includes(record.storeId))
        )
      case 'store':
        return Array.isArray(scope.storeIds) && scope.storeIds.includes(record.storeId)
      case 'region':
        return typeof scope.regionId === 'number' && record.regionId === scope.regionId
      case 'brand':
        return typeof scope.brandId === 'number' && record.brandId === scope.brandId
      default:
        return false
    }
  }

  /**
   * 直写保存线索（同步执行）。用于队列不可用或显式禁用时的回退路径。
   * 尽量遵循处理器的字段规范化，但仅保证关键路径与必填字段。
   */
  private async saveDirect(@Req() req: any, @Body() body: any) {
    // 解析用户/员工与数据范围
    const scope = await this.dataScopeService.getScope(req.user)
    const userId = Number(req?.user?.sub)
    const user = userId ? await this.userService.findById(userId) : null
    const employeeId = user?.employeeId ?? null

    // 解析门店ID：优先 body.storeId，其次数据范围唯一门店，其次员工绑定门店
    let storeId: number | undefined = undefined
    if (typeof body.storeId === 'number') {
      storeId = Number(body.storeId)
    } else if (Array.isArray(scope.storeIds) && scope.storeIds.length === 1) {
      storeId = Number(scope.storeIds[0])
    } else if (typeof employeeId === 'number') {
      const emp = await this.empRepo.findOne({ where: { id: employeeId } })
      if (typeof emp?.storeId === 'number') storeId = Number(emp.storeId)
    }
    if (!storeId || Number.isNaN(storeId)) {
      return { code: 400, msg: '请指定线索归属门店', data: false }
    }

    // 校验门店实体存在且类型为 store
    const storeDept = await this.deptRepo.findOne({ where: { id: storeId } })
    if (!storeDept || storeDept.type !== 'store') {
      return { code: 400, msg: '无效的门店ID', data: false }
    }

    // 解析品牌/区域（祖先）
    const { regionId, brandId } = await this.findAncestors(storeId)

    // 规范化客户（按门店+手机号+姓名）；若未提供手机号，允许空字符串直写以满足非空约束
    const phone = String(body.customerPhone ?? '').trim()
    const name = String(body.customerName ?? '').trim() || '未命名客户'
    let customerId: number | undefined = undefined
    if (phone) {
      const existCustomer = await this.customerRepo.findOne({ where: { phone, storeId, name } })
      if (existCustomer) {
        existCustomer.name = name || existCustomer.name
        const saved = await this.customerRepo.save(existCustomer)
        customerId = saved.id
      } else {
        const created = this.customerRepo.create({ name, phone, storeId })
        const saved = await this.customerRepo.save(created)
        customerId = saved.id
      }
    }

    // 规范化渠道（仅引用已存在渠道，不新增）
    const lvl1 = body.channelLevel1 ? String(body.channelLevel1) : ''
    const lvl2 = body.channelLevel2 ? String(body.channelLevel2) : ''
    const meta = this.computeChannelMetaByLevel1(lvl1)
    const rawCat = (body.channelCategory ? String(body.channelCategory) : '').trim()
    const rawSrc = (body.businessSource ? String(body.businessSource) : '').trim()
    let category: string | undefined = rawCat || meta.category || undefined
    let src: string | undefined = rawSrc || meta.source || undefined
    let channelId: number | undefined = undefined
    try {
      // 优先按四元组匹配
      let chan: Channel | null = null
      if (category && src) {
        const compoundKey = `${category}|${src}|${lvl1}|${lvl2}`
        chan = (await this.channelRepo.findOne({ where: { compoundKey } })) || null
      }
      // 退化到按 level1/level2 匹配（忽略分类与来源差异）
      if (!chan && (lvl1 || lvl2)) {
        chan =
          (await this.channelRepo.findOne({
            where: { level1: lvl1 || undefined, level2: lvl2 || undefined }
          })) || null
      }
      if (chan) {
        channelId = chan.id
        category = chan.category
        src = chan.businessSource
        // 统一一级/二级渠道为渠道表记录
        // 若传入值与渠道表不一致，以渠道表为准
      } else if (this.features.isEnabled('STRICT_CHANNEL_LOOKUP', true)) {
        return { code: 400, msg: '渠道不存在或未配置，请到渠道管理维护后再导入', data: false }
      }
    } catch (_) {
      // 渠道不影响直写主流程，若关闭严格校验则以冗余字段保留
    }

    // 解析车型ID（可选按名称反查）
    let focusModelIdResolved: number | undefined =
      typeof body.focusModelId === 'number' ? Number(body.focusModelId) : undefined
    if (!focusModelIdResolved && body.focusModelName) {
      focusModelIdResolved = await this.resolveModelIdByName(String(body.focusModelName))
    }
    let dealModelIdResolved: number | undefined =
      typeof body.dealModelId === 'number' ? Number(body.dealModelId) : undefined
    if (!dealModelIdResolved && body.dealModelName) {
      dealModelIdResolved = await this.resolveModelIdByName(String(body.dealModelName))
    }

    // 构造并直写线索
    const normalizedVisitDate = this.normalizeDateYYYYMMDD(body.visitDate)
    const normalizedEnter = this.normalizeTimeHHMMSS(body.enterTime)
    const normalizedLeave = this.normalizeTimeHHMMSS(body.leaveTime)
    const autoDuration = this.computeDurationMinutes(normalizedEnter, normalizedLeave)
    const incoming: Partial<Clue> = {
      visitDate: normalizedVisitDate || String(body.visitDate || '').slice(0, 10),
      enterTime: normalizedEnter,
      leaveTime: normalizedLeave,
      receptionDuration: Number(body.receptionDuration ?? 0) || (autoDuration ?? 0),
      visitorCount: Number(body.visitorCount ?? 1) || 1,
      receptionStatus: (body.receptionStatus as any) ?? 'sales',
      salesConsultant: body.salesConsultant ?? undefined,

      customerName: name,
      customerPhone: phone, // 允许空字符串以满足非空约束
      customerId,

      visitPurpose: (body.visitPurpose as any) ?? '看车',
      isAddWeChat: !!(body.isAddWeChat ?? body.isReserved ?? false),
      visitCategory: (body.visitCategory as any) ?? '首次',

      focusModelId: focusModelIdResolved,
      focusModelName: body.focusModelName ?? undefined,
      testDrive: !!body.testDrive,
      bargaining: !!body.bargaining,
      dealDone: !!body.dealDone,
      dealModelId: dealModelIdResolved,
      dealModelName: body.dealModelName ?? undefined,

      businessSource: src,
      channelCategory: category,
      channelLevel1: lvl1 || undefined,
      channelLevel2: lvl2 || undefined,
      channelId,
      convertOrRetentionModel: body.convertOrRetentionModel ?? undefined,
      referrer: body.referrer ?? undefined,
      contactTimes: Number(body.contactTimes ?? 1) || 1,

      opportunityLevel: (String(body.opportunityLevel || 'B').toUpperCase() as any) as 'H' | 'A' | 'B' | 'C',

      userGender: (body.userGender as any) ?? '未知',
      userAge: Number(body.userAge ?? 0) || 0,
      buyExperience: (body.buyExperience as any) ?? '首购',
      userPhoneModel: body.userPhoneModel ?? undefined,
      currentBrand: body.currentBrand ?? undefined,
      currentModel: body.currentModel ?? undefined,
      carAge: Number(body.carAge ?? 0) || 0,
      mileage: Number(body.mileage ?? 0) || 0,
      livingArea: this.normalizeLivingAreaPreferSCOrCQ(body.livingArea ?? undefined),

      storeId,
      regionId: regionId ?? undefined,
      brandId: brandId ?? undefined,
      departmentId: (typeof body.departmentId === 'number' ? Number(body.departmentId) : undefined) ?? undefined,
      // 优先用登录用户ID；若绑定了员工则使用员工ID
      createdBy: (typeof userId === 'number' && !Number.isNaN(userId))
        ? userId
        : (typeof employeeId === 'number' ? employeeId : undefined)
    }

    // 基本必填校验
    if (!incoming.visitDate) {
      return { code: 400, msg: '到店日期必填', data: false }
    }
    if (!incoming.customerName) {
      return { code: 400, msg: '客户姓名必填', data: false }
    }
    // 不在后端重复前端的条件校验，保留通用必填与字段规范化即可

    const entity = this.repo.create(incoming)
    const saved = await this.repo.save(entity)
    return { code: 200, msg: '线索保存成功（直写）', data: !!saved?.id }
  }

}
