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
      /** 关联员工ID（用于数据范围与门店限制） */
      employeeId?: number
      /** 归属门店ID（用于限制线索门店选择） */
      storeId?: number
      /** 归属品牌ID（用于品牌范围过滤） */
      brandId?: number
      /** 归属品牌名称（商品品牌过滤使用） */
      brandName?: string
    }

    // 新增：注册参数
    interface RegisterParams {
      username: string
      password: string
      name: string
      phone: string
    }
  }

  /** 用户中心类型 */
  namespace UserCenter {
    /** 个人资料 */
    interface Profile {
      realName: string
      nickName: string
      email: string
      mobile: string
      address: string
      sex: string // '1' | '2'
      des: string
      /** 岗位（来自员工 role 映射） */
      position?: string
      /** 组织路径（集团/品牌/区域/门店/部门名称拼接） */
      orgPath?: string
    }

    /** 保存个人资料参数 */
    type SaveProfileParams = Partial<Profile>

    /** 改密参数 */
    interface ChangePasswordParams {
      currentPassword: string
      newPassword: string
      confirmPassword: string
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
      type: 'group' | 'brand' | 'region' | 'store' | 'department' | 'team'
      /** 上级ID */
      parentId?: number
      /** 部门编号（层级编码） */
      code?: string
      /** 启用状态 */
      enabled: boolean
      /** 创建时间 */
      createTime: string
      /** 子节点 */
      children?: DepartmentItem[]
    }

    /** 部门搜索参数 */
    type DepartmentSearchParams = Partial<
      Pick<DepartmentItem, 'name' | 'enabled'> & Api.Common.CommonSearchParams
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
      /** 小组ID（门店下的 department）*/
      departmentId?: number
      /** 入职时间 */
      hireDate?: string
    }

    /** 员工搜索参数 */
    type EmployeeSearchParams = Partial<
      Pick<
        EmployeeItem,
        | 'name'
        | 'phone'
        | 'role'
        | 'gender'
        | 'status'
        | 'brandId'
        | 'regionId'
        | 'storeId'
        | 'departmentId'
      > &
        Api.Common.CommonSearchParams
    >

    /** 角色权限：获取参数 */
    interface RolePermissionsGetParams {
      roleId: number
    }

    /** 角色权限：保存参数 */
    interface RolePermissionsSaveParams {
      roleId: number
      keys: string[]
    }

    /** 角色权限：键列表 */
    type RolePermissionKeys = string[]
  }

  /** 商机类型 */
  namespace Opportunity {
    /** 商机列表项（与后端 OpportunityController 映射） */
    interface Item {
      id: number
      opportunityCode?: string
      customerName: string
      customerPhone: string
      status: '跟进中' | '已战败' | '已成交'
      opportunityLevel: 'H' | 'A' | 'B' | 'C' | 'O'
      focusModelId?: number | null
      focusModelName?: string | null
      testDrive: boolean
      bargaining: boolean
      ownerId?: number | null
      ownerName?: string | null
      storeId: number
      regionId?: number | null
      brandId?: number | null
      departmentId?: number | null
      ownerDepartmentId?: number | null
      openDate?: string
      latestVisitDate?: string
      channelCategory?: string
      businessSource?: string
      channelLevel1?: string
      channelLevel2?: string
      /** 战败原因（后端存储字符串，前端自行拆分） */
      failReason?: string | null
      createdAt?: string
    }

    /** 商机列表（分页） */
    type List = Api.Common.PaginatedResponse<Item>

    /** 商机搜索参数 */
    type SearchParams = Partial<
      Pick<Item, 'customerName' | 'customerPhone' | 'opportunityLevel' | 'status'> &
        Api.Common.CommonSearchParams
    > & {
      /** 最新联系时间范围：YYYY-MM-DD 两端闭区间 */
      daterange?: string[]
    }

    /** 商机跟进记录项 */
    interface FollowItem {
      id: number
      opportunityId: number
      opportunityName?: string
      content: string
      followResult?: string
      nextContactTime: string
      status: string
      method: string
      createdAt: string
    }

    /** 商机跟进记录分页列表 */
    type FollowList = Api.Common.PaginatedResponse<FollowItem>

    /** 商机跟进记录查询参数 */
    type FollowSearchParams = Partial<
      Pick<FollowItem, 'status' | 'method'> & {
        opportunityId?: number
        keyword?: string
      } & Api.Common.CommonSearchParams
    >
  }
}
