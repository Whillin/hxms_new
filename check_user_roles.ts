import { DataSource } from 'typeorm'
import { User } from './server/src/users/user.entity'
import { Employee } from './server/src/employees/employee.entity'
import { Role } from './server/src/roles/role.entity'

const AppDataSource = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'password', // Assuming default or from env, but I'll try to use env if possible or standard
  database: 'hxms_new',
  entities: [User, Employee, Role],
  synchronize: false
})

async function run() {
  try {
    await AppDataSource.initialize()
    console.log('Database connected')

    const empRepo = AppDataSource.getRepository(Employee)
    const userRepo = AppDataSource.getRepository(User)
    const roleRepo = AppDataSource.getRepository(Role)

    const emp = await empRepo.findOne({ where: { name: '杜红川' } })
    if (!emp) {
      console.log('Employee 杜红川 not found')
    } else {
      console.log('Employee found:', emp.id, emp.name, emp.role)
      const user = await userRepo.findOne({ where: { employeeId: emp.id } })
      if (!user) {
        console.log('User not found for employee ID:', emp.id)
      } else {
        console.log('User found:', user.id, user.userName, user.roles)
      }
    }

    const xiong = await empRepo.findOne({ where: { name: '熊海钧' } })
    if (!xiong) {
      console.log('Employee 熊海钧 not found')
    } else {
      console.log('Employee found:', xiong.id, xiong.name, xiong.role)
      const user = await userRepo.findOne({ where: { employeeId: xiong.id } })
      if (!user) {
        console.log('User not found for employee ID:', xiong.id)
      } else {
        console.log('User found:', user.id, user.userName, user.roles)
      }
    }

    const roles = await roleRepo.find()
    console.log('All Roles:', roles.map((r) => `${r.roleName}(${r.roleCode})`).join(', '))

    await AppDataSource.destroy()
  } catch (error) {
    console.error('Error:', error)
  }
}

run()
