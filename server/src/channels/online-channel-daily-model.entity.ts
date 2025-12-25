import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm'

/** 每日线上渠道车型拆分（规范化表） */
@Entity('online_channel_daily_model')
export class OnlineChannelDailyModel {
  @PrimaryGeneratedColumn()
  id!: number

  /** 关联每日填报记录ID */
  @Index('idx_daily_model_daily')
  @Column('int')
  dailyId!: number

  /** 车型ID（可为空，允许仅存名称以兼容外部平台未对齐字典的情况） */
  @Index('idx_daily_model_mid')
  @Column('int', { nullable: true })
  modelId?: number | null

  /** 车型名称冗余（便于展示与兼容未匹配ID的情况） */
  @Column('varchar', { length: 120, nullable: true })
  modelName?: string | null

  /** 数量（≥0） */
  @Column('int', { default: 0 })
  count!: number

  /** 唯一键：dailyId + modelId + modelName（modelId 为空时以名称参与唯一约束） */
  @Index('uniq_daily_model_compound', { unique: true })
  @Column('varchar', { length: 191, unique: true })
  uniqueKey!: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
