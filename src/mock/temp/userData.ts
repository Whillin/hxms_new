// 用户Mock数据
export interface UserItemMock {
  id: number
  userName: string
  userGender: string
  nickName: string
  phone: string
  email: string
  userStatus: string
  createTime: string
}

export const USER_LIST_DATA: UserItemMock[] = [
  {
    id: 1,
    userName: 'admin',
    userGender: '1',
    nickName: '超级管理员',
    phone: '15888888888',
    email: 'admin@example.com',
    userStatus: '1',
    createTime: '2024-01-01 10:00:00'
  },
  {
    id: 2,
    userName: 'user001',
    userGender: '1',
    nickName: '张三',
    phone: '13666666666',
    email: 'zhangsan@example.com',
    userStatus: '1',
    createTime: '2024-01-02 14:30:00'
  },
  {
    id: 3,
    userName: 'user002',
    userGender: '0',
    nickName: '李四',
    phone: '13777777777',
    email: 'lisi@example.com',
    userStatus: '1',
    createTime: '2024-01-03 09:15:00'
  },
  {
    id: 4,
    userName: 'user003',
    userGender: '1',
    nickName: '王五',
    phone: '13888888888',
    email: 'wangwu@example.com',
    userStatus: '0',
    createTime: '2024-01-04 16:45:00'
  },
  {
    id: 5,
    userName: 'user004',
    userGender: '0',
    nickName: '赵六',
    phone: '13999999999',
    email: 'zhaoliu@example.com',
    userStatus: '1',
    createTime: '2024-01-05 11:20:00'
  },
  {
    id: 6,
    userName: 'manager001',
    userGender: '1',
    nickName: '部门经理',
    phone: '15000000000',
    email: 'manager@example.com',
    userStatus: '1',
    createTime: '2024-01-06 08:30:00'
  },
  {
    id: 7,
    userName: 'operator001',
    userGender: '0',
    nickName: '操作员小美',
    phone: '15111111111',
    email: 'operator@example.com',
    userStatus: '1',
    createTime: '2024-01-07 13:10:00'
  },
  {
    id: 8,
    userName: 'guest001',
    userGender: '1',
    nickName: '访客用户',
    phone: '15222222222',
    email: 'guest@example.com',
    userStatus: '0',
    createTime: '2024-01-08 15:25:00'
  }
]
