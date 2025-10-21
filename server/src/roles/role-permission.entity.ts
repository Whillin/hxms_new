import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity('role_permissions')
@Index('uniq_role_permission', ['roleId', 'permissionKey'], { unique: true })
export class RolePermission {
  @PrimaryGeneratedColumn()
  id!: number

  @Index('idx_role')
  @Column('int')
  roleId!: number

  // 例如：路由 name 或 "RouteName_add" 形式的按钮权限标识
  @Index('idx_permission_key')
  @Column('varchar', { length: 191 })
  permissionKey!: string

  @CreateDateColumn()
  createdAt!: Date
}
