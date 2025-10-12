// 华星名仕集团部门层级 mock 数据
// 层级：集团(group) -> 品牌(brand) -> 区域(region) -> 门店(store) -> 部门(department)

export interface DepartmentItemMock {
  id: number
  name: string
  type: 'group' | 'brand' | 'region' | 'store' | 'department'
  parentId?: number
  brand?: string
  region?: string
  store?: string
  enabled: boolean
  createTime: string
  children?: DepartmentItemMock[]
}

const DEPARTMENT_TREE_RAW_DATA: DepartmentItemMock[] = [
  {
    id: 1,
    name: '华星名仕集团',
    type: 'group',
    enabled: true,
    createTime: '2024-01-01 10:00:00',
    children: [
      // 信息部门（与品牌同级）
      {
        id: 100,
        name: '信息部门',
        type: 'brand',
        brand: '信息部门',
        enabled: true,
        createTime: '2024-01-01 10:00:00',
        children: [
          {
            id: 10001,
            name: '集团信息部',
            type: 'department',
            enabled: true,
            createTime: '2024-01-01 10:00:00'
          }
        ]
      },
      // 一汽奥迪
      {
        id: 10,
        name: '一汽奥迪',
        type: 'brand',
        brand: '一汽奥迪',
        enabled: true,
        createTime: '2024-01-01 10:00:00',
        children: [
          {
            id: 101,
            name: '成都区域',
            type: 'region',
            region: '成都区域',
            enabled: true,
            createTime: '2024-01-01 10:00:00',
            children: [
              { id: 10101, name: '羊西店', type: 'store', store: '羊西店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1010101, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] },
              { id: 10102, name: '龙潭店', type: 'store', store: '龙潭店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1010201, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] },
              { id: 10103, name: '新都店', type: 'store', store: '新都店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1010301, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] },
              { id: 10104, name: '温江店', type: 'store', store: '温江店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1010401, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] }
            ]
          },
          {
            id: 102,
            name: '川边区域',
            type: 'region',
            region: '川边区域',
            enabled: true,
            createTime: '2024-01-01 10:00:00',
            children: [
              { id: 10201, name: '德阳店', type: 'store', store: '德阳店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1020101, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] },
              { id: 10202, name: '南充店', type: 'store', store: '南充店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1020201, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] },
              { id: 10203, name: '高坪店', type: 'store', store: '高坪店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1020301, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] },
              { id: 10204, name: '广安店', type: 'store', store: '广安店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1020401, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] },
              { id: 10205, name: '眉山店', type: 'store', store: '眉山店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1020501, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] },
              { id: 10206, name: '泸州店', type: 'store', store: '泸州店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1020601, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] }
            ]
          },
          { id: 103, name: '云南区域', type: 'region', region: '云南区域', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 10301, name: '驰泰店', type: 'store', store: '驰泰店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1030101, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] }, { id: 10302, name: '云南华星店', type: 'store', store: '云南华星店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1030201, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] }, { id: 10303, name: '红河店', type: 'store', store: '红河店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1030301, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] } ] },
          { id: 104, name: '贵州区域', type: 'region', region: '贵州区域', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 10401, name: '贵阳店', type: 'store', store: '贵阳店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1040101, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] } ] },
          { id: 105, name: '河北区域', type: 'region', region: '河北区域', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 10501, name: '廊坊店', type: 'store', store: '廊坊店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1050101, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] }, { id: 10502, name: '三河店', type: 'store', store: '三河店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1050201, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] } ] },
          { id: 106, name: '湖南区域', type: 'region', region: '湖南区域', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 10601, name: '岳阳店', type: 'store', store: '岳阳店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1060101, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] } ] },
          { id: 107, name: '安徽区域', type: 'region', region: '安徽区域', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 10701, name: '马鞍山店', type: 'store', store: '马鞍山店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 1070101, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] } ] }
        ]
      },
      // 上汽奥迪
      {
        id: 20,
        name: '上汽奥迪',
        type: 'brand',
        brand: '上汽奥迪',
        enabled: true,
        createTime: '2024-01-01 10:00:00',
        children: [
          { id: 201, name: '成都区域', type: 'region', region: '成都区域', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 20101, name: '武侯店', type: 'store', store: '武侯店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 2010101, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] }, { id: 20102, name: '万象城店', type: 'store', store: '万象城店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 2010201, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] }, { id: 20103, name: '高新店', type: 'store', store: '高新店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 2010301, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] }, { id: 20104, name: '鹭洲里店', type: 'store', store: '鹭洲里店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 2010401, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] }, { id: 20105, name: '金牛店', type: 'store', store: '金牛店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 2010501, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] } ] },
          { id: 202, name: '云南区域', type: 'region', region: '云南区域', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 20201, name: '同德店', type: 'store', store: '同德店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 2020101, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] }, { id: 20202, name: '昆明华星店', type: 'store', store: '昆明华星店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 2020201, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] } ] },
          { id: 203, name: '河北区域', type: 'region', region: '河北区域', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 20301, name: '廊坊店', type: 'store', store: '廊坊店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 2030101, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] } ] },
          { id: 204, name: '重庆区域', type: 'region', region: '重庆区域', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 20401, name: '重庆店', type: 'store', store: '重庆店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 2040101, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] } ] }
        ]
      },
      // 小鹏
      {
        id: 30,
        name: '小鹏',
        type: 'brand',
        brand: '小鹏',
        enabled: true,
        createTime: '2024-01-01 10:00:00',
        children: [
          { id: 301, name: '川边区域', type: 'region', region: '川边区域', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 30101, name: '泸州店', type: 'store', store: '泸州店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 3010101, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] } ] },
          { id: 302, name: '河北区域', type: 'region', region: '河北区域', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 30201, name: '廊坊店', type: 'store', store: '廊坊店', enabled: true, createTime: '2024-01-01 10:00:00', children: [ { id: 3020101, name: '销售部门', type: 'department', enabled: true, createTime: '2024-01-01 10:00:00' } ] } ] }
        ]
      }
    ]
  }
]

// 平铺列表（用于分页场景，可选）
export const DEPARTMENT_FLAT_LIST: DepartmentItemMock[] = []

// 递归函数：为所有节点补充品牌和区域归属信息
function enrichDepartmentData(nodes: DepartmentItemMock[], parentBrand?: string, parentRegion?: string): DepartmentItemMock[] {
  return nodes.map(node => {
    const enrichedNode = { ...node }
    
    // 继承父级的品牌和区域信息
    if (!enrichedNode.brand && parentBrand) {
      enrichedNode.brand = parentBrand
    }
    if (!enrichedNode.region && parentRegion) {
      enrichedNode.region = parentRegion
    }
    
    // 递归处理子节点
    if (enrichedNode.children && enrichedNode.children.length > 0) {
      enrichedNode.children = enrichDepartmentData(
        enrichedNode.children,
        enrichedNode.brand || parentBrand,
        enrichedNode.region || parentRegion
      )
    }
    
    return enrichedNode
  })
}

// 应用数据增强
const ENRICHED_DEPARTMENT_TREE_DATA = enrichDepartmentData(DEPARTMENT_TREE_RAW_DATA)

// 导出增强后的数据（对外统一使用 DEPARTMENT_TREE_DATA）
export const DEPARTMENT_TREE_DATA = ENRICHED_DEPARTMENT_TREE_DATA