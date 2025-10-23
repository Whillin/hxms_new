import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

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

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}