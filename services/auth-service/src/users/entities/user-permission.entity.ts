import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from './user.entity';
import type { AdditionalPermission } from './user.types';

@Entity('user_permissions')
@Check(
  'ck_user_permissions_code',
  "permission IN ('VIEW_OTHER_INVENTORY', 'SHIP_TRANSFER', 'RECEIVE_TRANSFER', 'ADJUST_INVENTORY')",
)
export class UserPermission {
  @PrimaryColumn({
    name: 'user_id',
    type: 'uuid',
    primaryKeyConstraintName: 'pk_user_permissions',
  })
  userId: string;

  @PrimaryColumn({
    type: 'varchar',
    length: 32,
    primaryKeyConstraintName: 'pk_user_permissions',
  })
  permission: AdditionalPermission;

  @Column({ name: 'granted_by', type: 'uuid' })
  grantedBy: string;

  @Column({
    name: 'granted_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  grantedAt: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'fk_user_permissions_user',
  })
  user: User;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'granted_by',
    foreignKeyConstraintName: 'fk_user_permissions_granter',
  })
  granter: User;
}
