import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

/** 客户信息实体（与线索分离，便于复用与维护） */
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id!: number

  /** 姓名与电话（电话唯一便于查找合并） */
  @Column('varchar', { length: 50 })
  name!: string

  @Index('uniq_customer_phone', { unique: true })
  @Column('varchar', { length: 20, unique: true })
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