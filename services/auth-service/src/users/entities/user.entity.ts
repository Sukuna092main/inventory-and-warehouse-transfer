import { Check, Column, Entity, Index, PrimaryColumn, Unique } from 'typeorm';
import type { UserRole, UserStatus } from './user.types';

@Entity('users')
@Unique('uq_users_username', ['username'])
@Unique('uq_users_email', ['email'])
@Index('idx_users_warehouse', ['assignedWarehouseId'])
@Check(
  'ck_users_username',
  "username = lower(btrim(username)) AND username ~ '^[a-z0-9][a-z0-9._-]{2,49}$'",
)
@Check(
  'ck_users_email',
  "email = lower(btrim(email)) AND email !~ '[[:space:]]' AND length(email) > 0",
)
@Check('ck_users_password_hash', "password_hash ~ '[^[:space:]]'")
@Check(
  'ck_users_role',
  "role IN ('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')",
)
@Check('ck_users_status', "status IN ('ACTIVE', 'INACTIVE')")
@Check(
  'ck_users_warehouse',
  "role = 'ADMIN' OR assigned_warehouse_id IS NOT NULL",
)
export class User {
  // The application supplies UUIDs using crypto.randomUUID().
  @PrimaryColumn({ type: 'uuid', primaryKeyConstraintName: 'pk_users' })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  username: string;

  @Column({ type: 'varchar', length: 254 })
  email: string;

  @Column({ name: 'password_hash', type: 'text', select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 32 })
  role: UserRole;

  // Logical Warehouse reference, deliberately no cross-service foreign key.
  @Column({ name: 'assigned_warehouse_id', type: 'uuid', nullable: true })
  assignedWarehouseId: string | null;

  @Column({ type: 'varchar', length: 16, default: 'ACTIVE' })
  status: UserStatus;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  // Application updates this explicitly, including permission changes, in its transaction.
  @Column({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
