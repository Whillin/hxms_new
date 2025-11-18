import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm'

/** 每日线上渠道填报（门店维度） */
@Entity('online_channel_daily')
export class OnlineChannelDaily {
  @PrimaryGeneratedColumn()
  id!: number

  /** 门店ID（department 的门店层级） */
  @Index('idx_daily_store_date')
  @Column('int')
  storeId!: number

  /** 填报日期（自然日） */
  @Index('idx_daily_store_date')
  @Column('date')
  date!: string

  /** 渠道唯一键：level1|level2，与字典表一致 */
  @Index('idx_daily_compound')
  @Column('varchar', { length: 255 })
  compoundKey!: string

  /** 冗余便于统计与展示 */
  @Index('idx_daily_level1')
  @Column('varchar', { length: 50 })
  level1!: string

  @Index('idx_daily_level2')
  @Column('varchar', { length: 50 })
  level2!: string

  /** 当日线索数量（≥0） */
  @Column('int', { default: 0 })
  count!: number

  /** 是否补录（date < 今天） */
  @Column('tinyint', { default: false })
  isBackfill!: boolean

  /** 是否已提交完成（用于完成率统计） */
  @Column('tinyint', { default: false })
  submitted!: boolean

  /** 操作人 */
  @Column('int', { nullable: true })
  createdBy?: number

  @Column('int', { nullable: true })
  updatedBy?: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  /** 唯一键：storeId + date + compoundKey 防止重复 */
  @Index('uniq_daily_store_date_key', { unique: true })
  @Column('varchar', { length: 100, unique: true })
  uniqueKey!: string
}
