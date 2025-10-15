import { Module } from '@nestjs/common'
import { AuthController } from '../routes/auth.controller'
import { UserController } from '../routes/user.controller'
import { DepartmentController } from '../routes/department.controller'
import { EmployeeController } from '../routes/employee.controller'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [AuthController, UserController, DepartmentController, EmployeeController]
})
export class AppModule {}
