import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

/** 渠道实体（一级/二级/分类/来源） */
@Entity('channels')
export class Channel {
  @PrimaryGeneratedColumn()
  id!: number

  /** 渠道分类：线下/线上等 */
  @Index('idx_channel_category')
  @Column('varchar', { length: 20 })
  category!: string

  /** 业务来源：自然到店/活动/转介绍等 */
  @Index('idx_business_source')
  @Column('varchar', { length: 50 })
  businessSource!: string

  /** 一级/二级渠道名称 */
  @Column('varchar', { length: 50, nullable: true })
  level1?: string

  @Column('varchar', { length: 50, nullable: true })
  level2?: string

  /** 唯一约束：category + businessSource + level1 + level2 */
  @Index('uniq_channel_compound', { unique: true })
  @Column('varchar', { length: 255, unique: true })
  compoundKey!: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}