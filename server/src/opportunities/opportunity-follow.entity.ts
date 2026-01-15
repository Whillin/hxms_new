import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity('opportunity_follows')
export class OpportunityFollow {
  @PrimaryGeneratedColumn()
  id!: number

  @Index('idx_opp_follow_opp')
  @Column('int')
  opportunityId!: number

  @Index('idx_opp_follow_store')
  @Column('int')
  storeId!: number

  @Index('idx_opp_follow_region')
  @Column('int', { nullable: true })
  regionId?: number | null

  @Index('idx_opp_follow_brand')
  @Column('int', { nullable: true })
  brandId?: number | null

  @Index('idx_opp_follow_owner')
  @Column('int', { nullable: true })
  ownerId?: number | null

  @Column('varchar', { length: 50, nullable: true })
  ownerName?: string | null

  @Index('idx_opp_follow_owner_dept')
  @Column('int', { nullable: true })
  ownerDepartmentId?: number | null

  @Column('varchar', { length: 50, nullable: true })
  opportunityCode?: string | null

  @Column('varchar', { length: 50 })
  customerName!: string

  @Column('varchar', { length: 20 })
  customerPhone!: string

  @Column('varchar', { length: 500 })
  content!: string

  @Column('varchar', { length: 500, nullable: true })
  followResult?: string | null

  @Column('varchar', { length: 19 })
  nextContactTime!: string

  @Column('varchar', { length: 20, default: '跟进中' })
  status!: string

  @Column('varchar', { length: 20, default: '电话' })
  method!: string

  @Index('idx_opp_follow_creator')
  @Column('int', { nullable: true })
  creatorEmployeeId?: number | null

  @CreateDateColumn()
  createdAt!: Date
}
