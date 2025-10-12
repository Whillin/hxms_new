// 角色Mock数据
export interface RoleItemMock {
  id: number
  roleName: string
  roleCode: string
  roleStatus: string
  roleDesc: string
  createTime: string
}

export const ROLE_LIST_DATA: RoleItemMock[] = [
  {
    id: 1,
    roleName: '超级管理员',
    roleCode: 'SUPER_ADMIN',
    roleStatus: '1',
    roleDesc: '系统超级管理员，拥有所有权限',
    createTime: '2024-01-01 10:00:00'
  },
  {
    id: 2,
    roleName: '系统管理员',
    roleCode: 'SYSTEM_ADMIN',
    roleStatus: '1',
    roleDesc: '系统管理员，负责系统配置和用户管理',
    createTime: '2024-01-01 10:05:00'
  },
  {
    id: 3,
    roleName: '部门经理',
    roleCode: 'DEPT_MANAGER',
    roleStatus: '1',
    roleDesc: '部门经理，管理本部门员工和业务',
    createTime: '2024-01-01 10:10:00'
  },
  {
    id: 4,
    roleName: '普通用户',
    roleCode: 'NORMAL_USER',
    roleStatus: '1',
    roleDesc: '普通用户，基础业务操作权限',
    createTime: '2024-01-01 10:15:00'
  },
  {
    id: 5,
    roleName: '财务专员',
    roleCode: 'FINANCE_STAFF',
    roleStatus: '1',
    roleDesc: '财务专员，负责财务相关业务',
    createTime: '2024-01-01 10:20:00'
  },
  {
    id: 6,
    roleName: '销售代表',
    roleCode: 'SALES_REP',
    roleStatus: '1',
    roleDesc: '销售代表，负责客户开发和维护',
    createTime: '2024-01-01 10:25:00'
  },
  {
    id: 7,
    roleName: '客服专员',
    roleCode: 'CUSTOMER_SERVICE',
    roleStatus: '1',
    roleDesc: '客服专员，处理客户咨询和投诉',
    createTime: '2024-01-01 10:30:00'
  },
  {
    id: 8,
    roleName: '审核员',
    roleCode: 'AUDITOR',
    roleStatus: '0',
    roleDesc: '审核员，负责业务审核工作',
    createTime: '2024-01-01 10:35:00'
  }
]