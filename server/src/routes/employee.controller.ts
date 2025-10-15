import { Controller, Get, Query } from '@nestjs/common'

type Employee = {
  id: number
  name: string
  deptId: number
  title: string
  phone: string
  status: number
}

const EMPLOYEES: Employee[] = [
  { id: 1, name: '张三', deptId: 2, title: '销售', phone: '13800000001', status: 1 },
  { id: 2, name: '李四', deptId: 3, title: '工程师', phone: '13800000002', status: 1 },
  { id: 3, name: '王五', deptId: 4, title: '前端', phone: '13800000003', status: 1 },
  { id: 4, name: '赵六', deptId: 5, title: '后端', phone: '13800000004', status: 0 }
]

@Controller('api/employee')
export class EmployeeController {
  @Get('list')
  list(@Query() query: Record<string, any>) {
    const page = Number(query.page || 1)
    const pageSize = Number(query.pageSize || 10)
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = EMPLOYEES.slice(start, end)
    return { code: 200, msg: 'ok', data: { list, total: EMPLOYEES.length, page, pageSize } }
  }
}
