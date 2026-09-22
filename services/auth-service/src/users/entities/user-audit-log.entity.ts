import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from './user.entity';
import type { UserAuditAction, UserAuditSnapshot } from './user.types';

@Entity('user_audit_logs')
// DESC indexes and the append-only trigger are managed by the SQL migration.
@Index('idx_user_audit_created', { synchronize: false })
@Index('idx_user_audit_user_created', { synchronize: false })
@Check(
  'ck_user_audit_action',
  "action IN ('USER_CREATED', 'USER_UPDATED', 'USER_PASSWORD_CHANGED')",
)
@Check(
  'ck_user_audit_actor',
  "(actor_type = 'USER' AND actor_id IS NOT NULL) OR (actor_type = 'SYSTEM' AND actor_id IS NULL AND action = 'USER_CREATED')",
)
@Check(
  'ck_user_audit_before',
  "(action = 'USER_CREATED' AND before_data IS NULL) OR (action <> 'USER_CREATED' AND before_data IS NOT NULL AND jsonb_typeof(before_data) = 'object')",
)
@Check('ck_user_audit_after', "jsonb_typeof(after_data) = 'object'")
@Check('ck_user_audit_correlation', "correlation_id ~ '[^[:space:]]'")
export class UserAuditLog {
  @PrimaryColumn({
    type: 'uuid',
    primaryKeyConstraintName: 'pk_user_audit_logs',
  })
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'actor_type', type: 'varchar', length: 16 })
  actorType: 'USER' | 'SYSTEM';

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 32 })
  action: UserAuditAction;

  @Column({ name: 'before_data', type: 'jsonb', nullable: true })
  beforeData: UserAuditSnapshot | null;

  @Column({ name: 'after_data', type: 'jsonb' })
  afterData: UserAuditSnapshot;

  @Column({ name: 'correlation_id', type: 'varchar', length: 128 })
  correlationId: string;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'clock_timestamp()',
  })
  createdAt: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'fk_user_audit_user',
  })
  user: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'actor_id',
    foreignKeyConstraintName: 'fk_user_audit_actor',
  })
  actor: User | null;
}
