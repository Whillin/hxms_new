import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like } from 'typeorm'
import { Department, DeptType } from '../departments/department.entity'

type DepartmentItem = {
  id: number
  name: string
  type: DeptType
  parentId?: number
  code?: string
  enabled: boolean
  createTime: string
  children?: DepartmentItem[]
}

function toItem(row: Department): DepartmentItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    parentId: row.parentId,
    code: row.code,
    enabled: !!row.enabled,
    createTime: (row.createTime instanceof Date
      ? row.createTime
      : new Date(row.createTime)
    ).toISOString()
  }
}

function buildTree(rows: Department[]): DepartmentItem[] {
  const map = new Map<number, DepartmentItem>()
  const roots: DepartmentItem[] = []
  for (const r of rows) {
    map.set(r.id, toItem(r))
  }
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      const parent = map.get(node.parentId)!
      parent.children = parent.children || []
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

@Controller('api/department')
export class DepartmentController {
  constructor(@InjectRepository(Department) private readonly repo: Repository<Department>) {}

  private pad2(n: number) {
    return String(n).padStart(2, '0')
  }

  /**
   * 生成层级编号：
   * 品牌：<bb>
   * 销售部门：<bb>
   * 区域：<bb><rr>
   * 门店：<bb><rr><ss>
   * 注：集团不生成编号。
   */
  private async generateCode(type: DeptType, parentId?: number): Promise<string | undefined> {
    if (type === 'group') return undefined
    // 销售小组不生成编号
    if (type === 'team') return undefined
    if (!parentId) return undefined

    // 品牌：在同一集团下按出现顺序编号
    if (type === 'brand') {
      const count = await this.repo.count({ where: { parentId, type: 'brand' } })
      return this.pad2(count + 1)
    }

    // 销售部门：与品牌同码（品牌下唯一部门）
    if (type === 'department') {
      const brand = await this.repo.findOne({ where: { id: parentId } })
      if (!brand) return undefined
      // 若品牌尚未有编号，则为其补充编号
      if (!brand.code) {
        const bb = await this.generateCode('brand', brand.parentId)
        brand.code = bb
        if (bb) await this.repo.update(brand.id, { code: bb })
      }
      return brand.code || undefined
    }

    // 区域：<bb><rr>
    if (type === 'region') {
      const dept = await this.repo.findOne({ where: { id: parentId } })
      if (!dept) return undefined
      const base = dept.code || (await this.generateCode('department', dept.parentId))
      const count = await this.repo.count({ where: { parentId, type: 'region' } })
      const rr = this.pad2(count + 1)
      return base ? `${base}${rr}` : undefined
    }

    // 门店：<bb><rr><ss>
    if (type === 'store') {
      const region = await this.repo.findOne({ where: { id: parentId } })
      if (!region) return undefined
      const base = region.code || (await this.generateCode('region', region.parentId))
      const count = await this.repo.count({ where: { parentId, type: 'store' } })
      const ss = this.pad2(count + 1)
      return base ? `${base}${ss}` : undefined
    }

    return undefined
  }

  /**
   * 一次性回填所有缺失的编号（兼容旧数据：集团下直接挂区域/品牌）
   */
  @Post('rebuild-codes')
  async rebuildCodes() {
    const rows = await this.repo.find({ order: { id: 'ASC' } })
    const byId = new Map<number, Department>()
    rows.forEach((r) => byId.set(r.id, r))

    // 建树以便按层级生成
    const tree = buildTree(rows)

    const updates: { id: number; code: string }[] = []

    const pad2 = (n: number) => String(n).padStart(2, '0')
    const handleGroup = (groups: any[]) => {
      groups.forEach((g) => {
        const children = Array.isArray(g.children) ? g.children : []
        // 兼容：将 group 下的 brand 或者旧数据的 region 视为品牌层
        const brandLevel = children.filter((c: any) => c.type === 'brand' || c.type === 'region')
        brandLevel.forEach((b: any, bIdx: number) => {
          const bb = pad2(bIdx + 1)
          if (!b.code) {
            updates.push({ id: b.id, code: bb })
            b.code = bb
          }
          // 销售部门（如果存在）使用同码
          const dept = Array.isArray(b.children)
            ? b.children.find((c: any) => c.type === 'department')
            : null
          if (dept && !dept.code) {
            updates.push({ id: dept.id, code: bb })
            dept.code = bb
          }
          // 区域层：可能直接在品牌层之下（旧数据），或在 department 之下（新数据）
          const regionParent = dept || b
          const regions = Array.isArray(regionParent.children)
            ? regionParent.children.filter((c: any) => c.type === 'region')
            : []
          regions.forEach((r: any, rIdx: number) => {
            const rr = pad2(rIdx + 1)
            const rCode = `${bb}${rr}`
            if (!r.code) {
              updates.push({ id: r.id, code: rCode })
              r.code = rCode
            }
            const stores = Array.isArray(r.children)
              ? r.children.filter((c: any) => c.type === 'store')
              : []
            stores.forEach((s: any, sIdx: number) => {
              const ss = pad2(sIdx + 1)
              const sCode = `${bb}${rr}${ss}`
              if (!s.code) {
                updates.push({ id: s.id, code: sCode })
                s.code = sCode
              }
            })
          })
        })
      })
    }

    handleGroup(tree)

    if (updates.length) {
      for (const u of updates) {
        await this.repo.update(u.id, { code: u.code })
      }
    }

    return { code: 200, msg: '回填完成', data: { updated: updates.length } }
  }

  /**
   * 规范化历史数据类型：
   * - 将集团下的 region 统一改为 brand（旧数据把品牌用 region 表示）
   * - 将 brand 之下直接的 store 统一改为 department，并令其编码与品牌一致
   */
  @Post('normalize-types')
  async normalizeTypes(@Body() body?: { clearAllTeamCodes?: boolean }) {
    const rows = await this.repo.find({ order: { id: 'ASC' } })
    const byId = new Map<number, Department>()
    rows.forEach((r) => byId.set(r.id, r))

    const updates: { id: number; type?: DeptType; code?: string | null }[] = []

    const getParent = (r: Department) =>
      typeof r.parentId === 'number' ? byId.get(r.parentId!) : undefined

    // 1) 集团下的 region 视为品牌层，修正为 brand
    for (const r of rows) {
      const p = getParent(r)
      if (r.type === 'region' && (!p || p.type === 'group')) {
        updates.push({ id: r.id, type: 'brand' })
        r.type = 'brand'
        if (!r.code) {
          const bb = await this.generateCode('brand', r.parentId)
          if (bb) {
            updates.push({ id: r.id, code: bb })
            r.code = bb
          }
        }
      }
    }

    // 2) 品牌层（brand）下直接的 store 应为 department，编码与品牌一致
    for (const r of rows) {
      const p = getParent(r)
      if (r.type === 'store' && p && p.type === 'brand') {
        const bb = p.code || (await this.generateCode('brand', p.parentId))
        updates.push({ id: r.id, type: 'department', code: bb })
        r.type = 'department'
        r.code = bb
      }
    }

    // 3) 门店（store）之下的旧数据若为 department，应统一改为 team
    for (const r of rows) {
      const p = getParent(r)
      if (r.type === 'department' && p && p.type === 'store') {
        updates.push({ id: r.id, type: 'team' as DeptType })
        r.type = 'team' as DeptType
        // 小组不生成编码，清空旧编码以免混淆（使用 null 以避免 TypeORM 空更新集错误）
        if (r.code) {
          updates.push({ id: r.id, code: null })
          r.code = undefined
        }
      }
    }

    // 4) 可选：清理所有 team 的编码（包括历史上已是 team 的节点）
    const clearAllTeamCodes = !!(body && body.clearAllTeamCodes)
    if (clearAllTeamCodes) {
      for (const r of rows) {
        if (r.type === 'team' && r.code !== null) {
          updates.push({ id: r.id, code: null })
          r.code = undefined
        }
      }
    }

    for (const u of updates) {
      const payload: Partial<Department> = {}
      if (typeof u.type === 'string' && u.type) payload.type = u.type as any
      if (typeof u.code !== 'undefined') {
        // 允许将 code 置为 null 以清空旧值
        payload.code = u.code as any
      }
      // 仅当存在有效字段时才执行更新，避免 TypeORM 空更新错误
      if (Object.keys(payload).length > 0) {
        await this.repo.update(u.id, payload)
      }
    }
    return {
      code: 200,
      msg: '类型已规范化',
      data: { updated: updates.length, clearAllTeamCodes }
    }
  }
  /**
   * 获取部门列表：返回树或分页，当前返回树结构，由前端适配器处理
   */
  @Get('list')
  async list(@Query() query: Record<string, any>) {
    const where: Record<string, any> = {}
    if (typeof query.name === 'string' && query.name) where.name = Like(`%${query.name}%`)
    if (typeof query.type === 'string' && query.type) where.type = query.type
    if (typeof query.enabled !== 'undefined') {
      const e = String(query.enabled)
      where.enabled = e === 'true' || e === '1'
    }
    const rows = await this.repo.find({ where, order: { id: 'ASC' } })
    return { code: 200, msg: '获取成功', data: buildTree(rows) }
  }

  /**
   * 兼容旧接口：树结构
   */
  @Get('tree')
  async tree() {
    const rows = await this.repo.find({ order: { id: 'ASC' } })
    return { code: 200, msg: '获取成功', data: buildTree(rows) }
  }

  /**
   * 保存部门（新增/编辑）
   */
  @Post('save')
  async save(@Body() body: Partial<DepartmentItem>) {
    const id = body.id
    if (id) {
      const res = await this.repo.update(id, {
        name: body.name,
        enabled: body.enabled as any,
        type: body.type as DeptType,
        parentId: typeof body.parentId === 'number' ? body.parentId : undefined
      })
      const ok = !!res.affected && res.affected > 0
      if (ok) return { code: 200, msg: '更新成功', data: { success: true } }
      return { code: 400, msg: '更新失败：记录不存在或未变更', data: { success: false } }
    }
    try {
      const type = (body.type as DeptType) || 'group'
      const parentId = typeof body.parentId === 'number' ? body.parentId : undefined
      const code = await this.generateCode(type, parentId)
      const saved = await this.repo.save({
        name: body.name || '未命名部门',
        type,
        parentId,
        code,
        enabled: typeof body.enabled === 'boolean' ? body.enabled : true
      })
      if (saved?.id) return { code: 200, msg: '新增成功', data: { success: true } }
      return { code: 400, msg: '新增失败', data: { success: false } }
    } catch (e: any) {
      return { code: 400, msg: e?.message || '保存失败', data: { success: false } }
    }
  }

  /**
   * 删除部门
   */
  @Post('delete')
  async delete(@Body() body: { id?: number }) {
    try {
      if (!body || typeof body.id !== 'number')
        return { code: 400, msg: '参数错误：缺少或非法 id', data: false }
      const hasChildren = await this.repo.count({ where: { parentId: body.id } })
      if (hasChildren > 0)
        return { code: 400, msg: '删除失败：存在子部门，需先删除子节点', data: false }
      const res = await this.repo.delete(body.id)
      const ok = !!res.affected && res.affected > 0
      if (ok) return { code: 200, msg: '删除成功', data: true }
      return { code: 400, msg: '删除失败：记录不存在', data: false }
    } catch (e: any) {
      return { code: 400, msg: e?.message || '删除失败', data: false }
    }
  }
}
