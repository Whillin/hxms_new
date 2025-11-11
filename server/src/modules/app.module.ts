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
import { HealthController } from '../routes/health.controller'
import { MetricsController } from '../routes/metrics.controller'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { BullModule } from '@nestjs/bull'
import { CacheModule, CacheStore } from '@nestjs/cache-manager'
import { redisStore } from 'cache-manager-redis-store'
import { DebounceMiddleware } from '../common/debounce.middleware'
import { FeatureFlagsService } from '../common/feature-flags.service'
import { MiddlewareConsumer } from '@nestjs/common'

@Module({
  imports: [
    TypeOrmModule.forRoot(
      (() => {
        const base: any = {
          type: 'mysql',
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
          synchronize: String(process.env.TYPEORM_SYNC || '').toLowerCase() === 'true',
          maxQueryExecutionTime: Number(process.env.TYPEORM_MAX_MS || 2000),
          logger: 'advanced-console'
        }

        const loggingRaw = String(process.env.TYPEORM_LOGGING || '').trim()
        if (!loggingRaw) base.logging = false
        else if (loggingRaw.toLowerCase() === 'false') base.logging = false
        else if (loggingRaw.toLowerCase() === 'true') base.logging = true
        else if (loggingRaw.toLowerCase() === 'all') base.logging = 'all'
        else
          base.logging = loggingRaw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)

        if (process.env.MYSQL_REPLICA_HOST) {
          base.replication = {
            master: {
              host: process.env.MYSQL_HOST || 'localhost',
              port: Number(process.env.MYSQL_PORT || 3306),
              username: process.env.MYSQL_USER || 'root',
              password: process.env.MYSQL_PASSWORD || '123456',
              database: process.env.MYSQL_DB || 'hxms_dev'
            },
            slaves: [
              {
                host: process.env.MYSQL_REPLICA_HOST || 'mysql-replica',
                port: Number(process.env.MYSQL_REPLICA_PORT || 3306),
                username: process.env.MYSQL_REPLICA_USER || process.env.MYSQL_USER || 'root',
                password:
                  process.env.MYSQL_REPLICA_PASSWORD || process.env.MYSQL_PASSWORD || '123456'
              }
            ]
          }
        } else {
          base.host = process.env.MYSQL_HOST || 'localhost'
          base.port = Number(process.env.MYSQL_PORT || 3306)
          base.username = process.env.MYSQL_USER || 'root'
          base.password = process.env.MYSQL_PASSWORD || '123456'
          base.database = process.env.MYSQL_DB || 'hxms_dev'
        }

        return base
      })()
    ),
    // 配置 Bull 队列的 Redis 连接（读取环境变量 REDIS_HOST/REDIS_PORT）
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'redis',
        port: Number(process.env.REDIS_PORT || 6379)
      }
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
    UserModule,
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: (await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'redis',
            port: Number(process.env.REDIS_PORT || 6379)
          },
          ttl: Number(process.env.CACHE_TTL_MS || 10000)
        })) as unknown as CacheStore
      })
    }),
    // 全局限流（v5+ 采用数组定义；ttl 单位毫秒）
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    BullModule.registerQueue({
      name: 'clue-processing'
    })
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
    CustomerController,
    HealthController,
    MetricsController
  ],
  providers: [
    JwtGuard,
    DataScopeService,
    SeedService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    DebounceMiddleware,
    FeatureFlagsService
  ]
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DebounceMiddleware).forRoutes('clue/list', 'customer/list')
  }
}
