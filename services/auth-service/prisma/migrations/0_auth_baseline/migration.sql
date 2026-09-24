-- Baseline of the Auth schema already created by TypeORM. On an existing
-- database, mark this migration applied; run this SQL only for a new database.
-- CHECK constraints and the append-only audit trigger are deliberately kept
-- here because they cannot all be represented in schema.prisma.

CREATE TABLE "auth_migrations" (
  "id" SERIAL NOT NULL,
  "timestamp" bigint NOT NULL,
  "name" varchar NOT NULL,
  CONSTRAINT "PK_82f05f50f845bb141e322ebed60" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" uuid NOT NULL CONSTRAINT "pk_users" PRIMARY KEY,
  "username" varchar(50) NOT NULL,
  "email" varchar(254) NOT NULL,
  "password_hash" text NOT NULL,
  "role" varchar(32) NOT NULL,
  "assigned_warehouse_id" uuid,
  "status" varchar(16) NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "uq_users_username" UNIQUE ("username"),
  CONSTRAINT "uq_users_email" UNIQUE ("email"),
  CONSTRAINT "ck_users_username" CHECK (username = lower(btrim(username)) AND username ~ '^[a-z0-9][a-z0-9._-]{2,49}$'),
  CONSTRAINT "ck_users_email" CHECK (email = lower(btrim(email)) AND email !~ '[[:space:]]' AND length(email) > 0),
  CONSTRAINT "ck_users_password_hash" CHECK (password_hash ~ '[^[:space:]]'),
  CONSTRAINT "ck_users_role" CHECK (role IN ('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')),
  CONSTRAINT "ck_users_status" CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT "ck_users_warehouse" CHECK (role = 'ADMIN' OR assigned_warehouse_id IS NOT NULL)
);

CREATE INDEX "idx_users_warehouse" ON "users" ("assigned_warehouse_id");

CREATE TABLE "user_permissions" (
  "user_id" uuid NOT NULL,
  "permission" varchar(32) NOT NULL,
  "granted_by" uuid NOT NULL,
  "granted_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pk_user_permissions" PRIMARY KEY ("user_id", "permission"),
  CONSTRAINT "fk_user_permissions_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_user_permissions_granter" FOREIGN KEY ("granted_by") REFERENCES "users" ("id") ON DELETE RESTRICT,
  CONSTRAINT "ck_user_permissions_code" CHECK (permission IN ('VIEW_OTHER_INVENTORY', 'SHIP_TRANSFER', 'RECEIVE_TRANSFER', 'ADJUST_INVENTORY'))
);

CREATE TABLE "user_audit_logs" (
  "id" uuid NOT NULL CONSTRAINT "pk_user_audit_logs" PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "actor_type" varchar(16) NOT NULL,
  "actor_id" uuid,
  "action" varchar(32) NOT NULL,
  "before_data" jsonb,
  "after_data" jsonb NOT NULL,
  "correlation_id" varchar(128) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT "fk_user_audit_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_user_audit_actor" FOREIGN KEY ("actor_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
  CONSTRAINT "ck_user_audit_action" CHECK (action IN ('USER_CREATED', 'USER_UPDATED', 'USER_PASSWORD_CHANGED')),
  CONSTRAINT "ck_user_audit_actor" CHECK ((actor_type = 'USER' AND actor_id IS NOT NULL) OR (actor_type = 'SYSTEM' AND actor_id IS NULL AND action = 'USER_CREATED')),
  CONSTRAINT "ck_user_audit_before" CHECK ((action = 'USER_CREATED' AND before_data IS NULL) OR (action <> 'USER_CREATED' AND before_data IS NOT NULL AND jsonb_typeof(before_data) = 'object')),
  CONSTRAINT "ck_user_audit_after" CHECK (jsonb_typeof(after_data) = 'object'),
  CONSTRAINT "ck_user_audit_correlation" CHECK (correlation_id ~ '[^[:space:]]')
);

CREATE INDEX "idx_user_audit_created" ON "user_audit_logs" ("created_at" DESC, "id" DESC);
CREATE INDEX "idx_user_audit_user_created" ON "user_audit_logs" ("user_id", "created_at" DESC, "id" DESC);

CREATE FUNCTION "reject_user_audit_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'user_audit_logs is append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "trg_user_audit_append_only"
BEFORE UPDATE OR DELETE OR TRUNCATE ON "user_audit_logs"
FOR EACH STATEMENT EXECUTE FUNCTION "reject_user_audit_mutation"();
