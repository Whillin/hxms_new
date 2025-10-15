import { Controller, Get } from '@nestjs/common'

const DEPARTMENT_TREE_DATA = [
  {
    id: 1,
    name: '总公司',
    type: 'group',
    enabled: true,
    children: [
      { id: 2, name: '市场部', type: 'department', enabled: true },
      {
        id: 3,
        name: '研发部',
        type: 'department',
        enabled: true,
        children: [
          { id: 4, name: '前端组', type: 'department', enabled: true },
          { id: 5, name: '后端组', type: 'department', enabled: true }
        ]
      }
    ]
  }
]

@Controller('api/dept')
export class DepartmentController {
  @Get('tree')
  tree() {
    return DEPARTMENT_TREE_DATA
  }
}
