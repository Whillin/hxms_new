import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserController } from '../routes/user.controller'
import { DepartmentController } from '../routes/department.controller'
import { EmployeeController } from '../routes/employee.controller'
import { RoleController } from '../routes/role.controller'
import { AuthModule } from '../auth/auth.module'
import { UserModule } from '../users/user.module'
import { User } from '../users/user.entity'
import { Department } from '../departments/department.entity'
import { JwtGuard } from '../auth/jwt.guard'
import { Employee } from '../employees/employee.entity'
import { EmployeeStoreLink } from '../employees/employee-store.entity'
import { Role } from '../roles/role.entity'
import { RolePermission } from '../roles/role-permission.entity'
import { DataScopeService } from '../common/data-scope.service'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT || 3306),
      username: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '123456',
      database: process.env.MYSQL_DB || 'hxms_dev',
      entities: [User, Department, Employee, EmployeeStoreLink, Role, RolePermission],
      synchronize: true,
      logging: false
    }),
    // 注入各控制器需要的仓库
    TypeOrmModule.forFeature([Department, Employee, EmployeeStoreLink, Role, RolePermission]),
    AuthModule,
    UserModule
  ],
  controllers: [UserController, DepartmentController, EmployeeController, RoleController],
  providers: [JwtGuard, DataScopeService]
})
export class AppModule {}
