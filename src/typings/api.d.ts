/**
 * namespace: Api
 *
 * 所有接口相关类型定义
 * 在.vue文件使用会报错，需要在 eslint.config.mjs 中配置 globals: { Api: 'readonly' }
 */

declare namespace Api {
  /** 通用类型 */
  namespace Common {
    /** 分页参数 */
    interface PaginationParams {
      /** 当前页码 */
      current: number
      /** 每页条数 */
      size: number
      /** 总条数 */
      total: number
    }

    /** 通用搜索参数 */
    type CommonSearchParams = Pick<PaginationParams, 'current' | 'size'>

    /** 分页响应基础结构 */
    interface PaginatedResponse<T = any> {
      records: T[]
      current: number
      size: number
      total: number
    }

    /** 启用状态 */
    type EnableStatus = '1' | '2'
  }

  /** 认证类型 */
  namespace Auth {
    /** 登录参数 */
    interface LoginParams {
      userName: string
      password: string
    }

    /** 登录响应 */
    interface LoginResponse {
      token: string
      refreshToken: string
    }

    /** 用户信息 */
    interface UserInfo {
      buttons: string[]
      roles: string[]
      userId: number
      userName: string
      email: string
      avatar?: string
    }
  }

  /** 系统管理类型 */
  namespace SystemManage {
    /** 用户列表 */
    type UserList = Api.Common.PaginatedResponse<UserListItem>

    /** 用户列表项 */
    interface UserListItem {
      id: number
      avatar: string
      status: string
      userName: string
      userGender: string
      nickName: string
      userPhone: string
      userEmail: string
      userRoles: string[]
      createBy: string
      createTime: string
      updateBy: string
      updateTime: string
    }

    /** 用户搜索参数 */
    type UserSearchParams = Partial<
      Pick<UserListItem, 'id' | 'userName' | 'userGender' | 'userPhone' | 'userEmail' | 'status'> &
        Api.Common.CommonSearchParams
    >

    /** 角色列表 */
    type RoleList = Api.Common.PaginatedResponse<RoleListItem>

    /** 角色列表项 */
    interface RoleListItem {
      roleId: number
      roleName: string
      roleCode: string
      description: string
      enabled: boolean
      createTime: string
    }

    /** 角色搜索参数 */
    type RoleSearchParams = Partial<
      Pick<RoleListItem, 'roleId' | 'roleName' | 'roleCode' | 'description' | 'enabled'> &
        Api.Common.CommonSearchParams
    >

    /** 部门列表 */
    type DepartmentList = Api.Common.PaginatedResponse<DepartmentItem>

    /** 部门项（支持树形结构） */
    interface DepartmentItem {
      /** 唯一ID */
      id: number
      /** 部门名称 */
      name: string
      /** 部门类型 */
      type: 'group' | 'brand' | 'region' | 'store' | 'department'
      /** 上级ID */
      parentId?: number
      /** 品牌（如一汽奥迪、上汽奥迪、小鹏、信息部门） */
      brand?: string
      /** 区域（如成都区域、云南区域等） */
      region?: string
      /** 门店（如羊西店、武侯店等） */
      store?: string
      /** 启用状态 */
      enabled: boolean
      /** 创建时间 */
      createTime: string
      /** 子节点 */
      children?: DepartmentItem[]
    }

    /** 部门搜索参数 */
    type DepartmentSearchParams = Partial<
      Pick<DepartmentItem, 'name' | 'type' | 'brand' | 'region' | 'store' | 'enabled'> &
        Api.Common.CommonSearchParams
    >

    /** 员工列表 */
    type EmployeeList = Api.Common.PaginatedResponse<EmployeeItem>

    /** 员工项 */
    interface EmployeeItem {
      /** 主键ID */
      id: number
      /** 姓名 */
      name: string
      /** 手机号 */
      phone: string
      /** 性别 */
      gender: 'male' | 'female' | 'other'
      /** 在职/离职状态（1 在职 / 2 离职）*/
      status: Api.Common.EnableStatus
      /** 岗位角色编码 */
      role: string
      /** 品牌ID（集团/品牌）*/
      brandId?: number
      /** 区域ID */
      regionId?: number
      /** 门店ID */
      storeId?: number
      /** 入职时间 */
      hireDate?: string
    }

    /** 员工搜索参数 */
    type EmployeeSearchParams = Partial<
      Pick<EmployeeItem, 'name' | 'phone' | 'role' | 'gender' | 'status'> &
        Api.Common.CommonSearchParams
    >
  }
}
