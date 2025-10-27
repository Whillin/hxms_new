import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm'

/** 商品/车型实体（后续可拓展到品牌/车系等） */
@Entity('product_models')
export class ProductModel {
  @PrimaryGeneratedColumn()
  id!: number

  @Index('uniq_model_name', { unique: true })
  @Column('varchar', { length: 100, unique: true })
  name!: string

  /** 可选：所属品牌/系列 */
  @Column('varchar', { length: 50, nullable: true })
  brand?: string

  @Column('varchar', { length: 50, nullable: true })
  series?: string

  /** 动力类型：ICE/NEV/HEV */
  @Column('varchar', { length: 10, default: 'ICE' })
  engineType!: 'ICE' | 'NEV' | 'HEV'

  /** 指导价（元） */
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price!: number

  /** 状态：1 上架；0 下架 */
  @Column('tinyint', { default: 1 })
  status!: number

  /** 累计销量 */
  @Column('int', { default: 0 })
  sales!: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
