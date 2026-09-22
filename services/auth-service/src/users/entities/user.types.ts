export type UserRole = 'ADMIN' | 'WAREHOUSE_MANAGER' | 'WAREHOUSE_STAFF';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type AdditionalPermission =
  | 'VIEW_OTHER_INVENTORY'
  | 'SHIP_TRANSFER'
  | 'RECEIVE_TRANSFER'
  | 'ADJUST_INVENTORY';
export type UserAuditAction =
  'USER_CREATED' | 'USER_UPDATED' | 'USER_PASSWORD_CHANGED';

// Audit writers must explicitly select these fields; never spread a user entity.
export interface UserAuditSnapshot {
  username: string;
  email: string;
  role: UserRole;
  assigned_warehouse_id: string | null;
  status: UserStatus;
  additional_permissions: AdditionalPermission[];
}
