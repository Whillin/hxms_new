import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserController } from '../routes/user.controller'
import { DepartmentController } from '../routes/department.controller'
import { EmployeeController } from '../routes/employee.controller'
import { RoleController } from '../routes/role.controller'
import { ClueController } from '../routes/clue.controller'
import { AuthModule } from '../auth/auth.module'
import { UserModule } from '../users/user.module'
import { User } from '../users/user.entity'
import { Department } from '../departments/department.entity'
import { JwtGuard } from '../auth/jwt.guard'
import { Employee } from '../employees/employee.entity'
import { EmployeeStoreLink } from '../employees/employee-store.entity'
import { Role } from '../roles/role.entity'
import { RolePermission } from '../roles/role-permission.entity'
import { Clue } from '../clues/clue.entity'
import { DataScopeService } from '../common/data-scope.service'
import { Customer } from '../customers/customer.entity'
import { Channel } from '../channels/channel.entity'
import { ProductModel } from '../products/product-model.entity'
import { ChannelsController } from '../routes/channel.controller'
import { ProductCategory } from '../products/product-category.entity'
import { ProductCategoryLink } from '../products/product-category-link.entity'
import { CategoryController } from '../routes/category.controller'
import { ProductController } from '../routes/product.controller'
import { SeedService } from '../common/seed.service'
import { CustomerController } from '../routes/customer.controller'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT || 3306),
      username: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '123456',
      database: process.env.MYSQL_DB || 'hxms_dev',
      entities: [
        User,
        Department,
        Employee,
        EmployeeStoreLink,
        Role,
        RolePermission,
        Clue,
        Customer,
        Channel,
        ProductModel,
        ProductCategory,
        ProductCategoryLink
      ],
      // 生产环境默认关闭同步，避免 TypeORM 在启动时尝试创建/变更索引导致故障
      // 通过环境变量 TYPEORM_SYNC 控制，设置为 'true' 时开启
      synchronize: String(process.env.TYPEORM_SYNC || '').toLowerCase() === 'true',
      logging: false
    }),
    // 注入各控制器需要的仓库
    TypeOrmModule.forFeature([
      Department,
      Employee,
      EmployeeStoreLink,
      Role,
      RolePermission,
      Clue,
      Customer,
      Channel,
      ProductModel,
      ProductCategory,
      ProductCategoryLink
    ]),
    AuthModule,
    UserModule
  ],
  controllers: [
    UserController,
    DepartmentController,
    EmployeeController,
    RoleController,
    ClueController,
    ChannelsController,
    CategoryController,
    ProductController,
    CustomerController
  ],
  providers: [JwtGuard, DataScopeService, SeedService]
})
export class AppModule {}
