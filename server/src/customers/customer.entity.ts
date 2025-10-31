import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm'

/** 客户信息实体（与线索分离，便于复用与维护） */
@Entity('customers')
// 唯一约束调整：允许同门店相同手机号被不同姓名使用
@Index('uniq_store_phone_name', ['storeId', 'phone', 'name'], { unique: true })
// 兼顾查询性能，保留非唯一索引（storeId+phone）以便快速定位同号历史
@Index('idx_store_phone', ['storeId', 'phone'])
export class Customer {
  @PrimaryGeneratedColumn()
  id!: number

  /** 姓名与电话（电话唯一便于查找合并） */
  @Column('varchar', { length: 50 })
  name!: string

  // 客户归属门店（同店内手机号唯一，允许跨店重复）
  @Column('int')
  @Index('idx_customer_store')
  storeId!: number

  @Column('varchar', { length: 20 })
  phone!: string

  /** 画像与车辆情况 */
  @Column('varchar', { length: 10, default: '未知' })
  gender!: '男' | '女' | '未知'

  @Column('int', { default: 0 })
  age!: number

  @Column('varchar', { length: 10, default: '首购' })
  buyExperience!: '首购' | '换购' | '增购'

  @Column('varchar', { length: 50, nullable: true })
  phoneModel?: string

  @Column('varchar', { length: 50, nullable: true })
  currentBrand?: string

  @Column('varchar', { length: 50, nullable: true })
  currentModel?: string

  @Column('int', { default: 0 })
  carAge!: number

  @Column('decimal', { precision: 8, scale: 2, default: 0 })
  mileage!: number

  @Column('varchar', { length: 120, nullable: true })
  livingArea?: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
