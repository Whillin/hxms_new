// 员工相关工具

// 岗位标签（采用系统内统一编码 R_*）
// 品牌层级：品牌总经理
// 区域层级：区域总经理
// 门店层级：门店总监、店长、前台、销售经理、销售顾问、邀约专员
// 其他常见岗位：技术/售后、财务、人力
export const EMPLOYEE_ROLE_LABELS: Record<string, string> = {
  R_BRAND_GM: '品牌总经理',
  R_REGION_GM: '区域总经理',
  R_STORE_DIRECTOR: '门店总监',
  R_STORE_MANAGER: '店长',
  R_FRONT_DESK: '前台',
  R_SALES_MANAGER: '销售经理',
  R_SALES: '销售顾问',
  R_APPOINTMENT: '邀约专员',

  // 兼容项目中的其他角色编码
  R_TECH: '售后/技术',
  R_FINANCE: '财务',
  R_HR: '人力资源',
  R_ADMIN: '管理员'
}

// 岗位所属层级要求映射
// 用于在表单中动态校验部门选择的必填层级
export const EMPLOYEE_ROLE_LEVELS: Record<string, 'brand' | 'region' | 'store'> = {
  R_BRAND_GM: 'brand',
  R_REGION_GM: 'region',
  R_STORE_DIRECTOR: 'store',
  R_STORE_MANAGER: 'store',
  R_FRONT_DESK: 'store',
  R_SALES_MANAGER: 'store',
  R_SALES: 'store',
  R_APPOINTMENT: 'store',
  R_TECH: 'store',
  R_FINANCE: 'store',
  R_HR: 'store',
  R_ADMIN: 'brand'
}

// 获取角色中文名
export function getRoleLabel(role?: string) {
  if (!role) return ''
  return EMPLOYEE_ROLE_LABELS[role] ?? role
}

// 获取岗位要求层级（默认门店层级）
export function getRoleRequiredLevel(role?: string): 'brand' | 'region' | 'store' {
  if (!role) return 'store'
  return EMPLOYEE_ROLE_LEVELS[role] ?? 'store'
}
