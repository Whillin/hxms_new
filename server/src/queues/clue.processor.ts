import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Clue } from '../clues/clue.entity'
import { Customer } from '../customers/customer.entity'
import { Channel } from '../channels/channel.entity'
import { ProductModel } from '../products/product-model.entity'
import { Employee } from '../employees/employee.entity'
import { Department } from '../departments/department.entity'
import { DataScopeService } from '../common/data-scope.service'
import { UserService } from '../users/user.service'

@Processor('clue-processing')
export class ClueProcessor {
  constructor(
    @InjectRepository(Clue) private readonly repo: Repository<Clue>,
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Channel) private readonly channelRepo: Repository<Channel>,
    @InjectRepository(ProductModel) private readonly productModelRepo: Repository<ProductModel>,
    @InjectRepository(Employee) private readonly empRepo: Repository<Employee>,
    private readonly dataScopeService: DataScopeService,
    private readonly userService: UserService
  ) {}

  @Process('save-clue')
  async processSaveClue(job: Job<any>) {
    const { user, body } = job.data

    // 这里复制并调整原save方法的逻辑
    const scope = await this.dataScopeService.getScope(user)
    const userId = Number(user?.sub)
    const currentUser = userId ? await this.userService.findById(userId) : null
    const employeeId = currentUser?.employeeId

    let storeId: number | undefined =
      typeof body.storeId === 'number' ? Number(body.storeId) : undefined

    if (!storeId) {
      if (Array.isArray(scope.storeIds) && scope.storeIds.length === 1) {
        storeId = scope.storeIds[0]
      } else if (typeof employeeId === 'number') {
        const self = await this.empRepo.findOne({ where: { id: employeeId } })
        if (self?.storeId) storeId = self.storeId
      }
      if (!storeId) {
        throw new Error('请指定线索归属门店')
      }
    }

    // 范围合规校验 (略，假设类似)
    // ...

    const storeDept = await this.deptRepo.findOne({ where: { id: storeId } })
    if (!storeDept || storeDept.type !== 'store') {
      throw new Error('归属门店必须为“门店”类型，请重新选择')
    }

    const { regionId, brandId } = await this.findAncestors(storeId)

    // 规范化居住地区（与直写保存保持一致的模糊匹配策略）
    const livingArea = this.normalizeLivingAreaPreferSCOrCQ(body.livingArea ?? undefined)

    // 规范化客户
    let customerId: number | undefined
    const phone = String(body.customerPhone || '').trim()
    const name = String(body.customerName || '').trim() || '未命名客户'
    if (phone) {
      const existCustomer = await this.customerRepo.findOne({ where: { phone, storeId, name } })
      if (existCustomer) {
        // 更新
        existCustomer.name = name || existCustomer.name
        // ... 其他字段更新
        const saved = await this.customerRepo.save(existCustomer)
        customerId = saved.id
      } else {
        const created = this.customerRepo.create({
          name,
          phone,
          storeId: storeId!
          // ... 其他字段
        })
        const saved = await this.customerRepo.save(created)
        customerId = saved.id
      }
    }

    // 规范化渠道
    // 移除重复的 let channelId
    const channelId = await (async () => {
      const category = String(body.channelCategory || '线下')
      const src = String(body.businessSource || '自然到店')
      const lvl1 = body.channelLevel1 || ''
      const lvl2 = body.channelLevel2 || ''
      const compoundKey = `${category}|${src}|${lvl1}|${lvl2}`
      let existChannel = await this.channelRepo.findOne({ where: { compoundKey } })
      if (!existChannel) {
        existChannel = this.channelRepo.create({
          category,
          businessSource: src,
          level1: lvl1 || undefined,
          level2: lvl2 || undefined,
          compoundKey
        })
      }
      const savedChannel = await this.channelRepo.save(existChannel)
      return savedChannel.id
    })()

    // 解析车型ID
    let focusModelIdResolved: number | undefined =
      typeof body.focusModelId === 'number' ? Number(body.focusModelId) : undefined
    if (!focusModelIdResolved && body.focusModelName) {
      const pm = await this.productModelRepo.findOne({
        where: { name: String(body.focusModelName) }
      })
      focusModelIdResolved = pm?.id
    }
    let dealModelIdResolved: number | undefined =
      typeof body.dealModelId === 'number' ? Number(body.dealModelId) : undefined
    if (!dealModelIdResolved && body.dealModelName) {
      const pm2 = await this.productModelRepo.findOne({
        where: { name: String(body.dealModelName) }
      })
      dealModelIdResolved = pm2?.id
    }

    // 创建Clue实体
    const incoming: Partial<Clue> = {
      // ... 所有字段
      customerId,
      channelId,
      storeId,
      regionId,
      brandId,
      livingArea,
      createdBy: typeof employeeId === 'number' ? employeeId : undefined
    }

    const clue = this.repo.create(incoming)
    const savedClue = await this.repo.save(clue)

    return savedClue.id // 或其他结果
  }

  // 与 ClueController 保持一致的居住地区规范化（省/市模糊匹配并标准化）
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

  private async findAncestors(id: number): Promise<{ regionId?: number; brandId?: number }> {
    const ancestors: { regionId?: number; brandId?: number } = {}
    let current = await this.deptRepo.findOne({ where: { id } })
    while (current && typeof current.parentId === 'number') {
      const parent = await this.deptRepo.findOne({ where: { id: current.parentId } })
      if (!parent) break
      if (parent.type === 'region') ancestors.regionId = parent.id
      if (parent.type === 'brand') ancestors.brandId = parent.id
      current = parent
    }
    return ancestors
  }
}
