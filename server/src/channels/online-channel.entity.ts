import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm'

/** 线上渠道字典实体（来源/渠道，不含 category/businessSource） */
@Entity('online_channels')
export class OnlineChannel {
  @PrimaryGeneratedColumn()
  id!: number

  /** 一级来源（如：新媒体/垂媒/品牌） */
  @Index('idx_online_level1')
  @Column('varchar', { length: 50 })
  level1!: string

  /** 二级渠道（如：抖音/小红书/懂车帝/品牌推荐/其他） */
  @Index('idx_online_level2')
  @Column('varchar', { length: 50 })
  level2!: string

  /** 唯一约束：level1 + level2 */
  @Index('uniq_online_compound', { unique: true })
  @Column('varchar', { length: 255, unique: true })
  compoundKey!: string

  /** 启用状态与排序 */
  @Column('tinyint', { default: true })
  enabled!: boolean

  @Column('int', { default: 0 })
  sort!: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
