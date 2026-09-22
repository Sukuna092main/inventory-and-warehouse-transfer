import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthTables1790035200000 implements MigrationInterface {
  name = 'CreateAuthTables1790035200000';

  private schema(queryRunner: QueryRunner): string {
    const options = queryRunner.connection.options;
    const schema = 'schema' in options ? options.schema : undefined;
    return queryRunner.connection.driver.escape(schema ?? 'public');
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = this.schema(queryRunner);
    await queryRunner.query(`
      CREATE TABLE ${schema}.users (
        id uuid NOT NULL CONSTRAINT pk_users PRIMARY KEY,
        username varchar(50) NOT NULL,
        email varchar(254) NOT NULL,
        password_hash text NOT NULL,
        role varchar(32) NOT NULL,
        assigned_warehouse_id uuid,
        status varchar(16) NOT NULL DEFAULT 'ACTIVE',
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_users_username UNIQUE (username),
        CONSTRAINT uq_users_email UNIQUE (email),
        CONSTRAINT ck_users_username CHECK (username = lower(btrim(username)) AND username ~ '^[a-z0-9][a-z0-9._-]{2,49}$'),
        CONSTRAINT ck_users_email CHECK (email = lower(btrim(email)) AND email !~ '[[:space:]]' AND length(email) > 0),
        CONSTRAINT ck_users_password_hash CHECK (password_hash ~ '[^[:space:]]'),
        CONSTRAINT ck_users_role CHECK (role IN ('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')),
        CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'INACTIVE')),
        CONSTRAINT ck_users_warehouse CHECK (role = 'ADMIN' OR assigned_warehouse_id IS NOT NULL)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_users_warehouse ON ${schema}.users (assigned_warehouse_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE ${schema}.user_permissions (
        user_id uuid NOT NULL,
        permission varchar(32) NOT NULL,
        granted_by uuid NOT NULL,
        granted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT pk_user_permissions PRIMARY KEY (user_id, permission),
        CONSTRAINT fk_user_permissions_user FOREIGN KEY (user_id) REFERENCES ${schema}.users (id) ON DELETE RESTRICT,
        CONSTRAINT fk_user_permissions_granter FOREIGN KEY (granted_by) REFERENCES ${schema}.users (id) ON DELETE RESTRICT,
        CONSTRAINT ck_user_permissions_code CHECK (permission IN ('VIEW_OTHER_INVENTORY', 'SHIP_TRANSFER', 'RECEIVE_TRANSFER', 'ADJUST_INVENTORY'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE ${schema}.user_audit_logs (
        id uuid NOT NULL CONSTRAINT pk_user_audit_logs PRIMARY KEY,
        user_id uuid NOT NULL,
        actor_type varchar(16) NOT NULL,
        actor_id uuid,
        action varchar(32) NOT NULL,
        before_data jsonb,
        after_data jsonb NOT NULL,
        correlation_id varchar(128) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT fk_user_audit_user FOREIGN KEY (user_id) REFERENCES ${schema}.users (id) ON DELETE RESTRICT,
        CONSTRAINT fk_user_audit_actor FOREIGN KEY (actor_id) REFERENCES ${schema}.users (id) ON DELETE RESTRICT,
        CONSTRAINT ck_user_audit_action CHECK (action IN ('USER_CREATED', 'USER_UPDATED', 'USER_PASSWORD_CHANGED')),
        CONSTRAINT ck_user_audit_actor CHECK ((actor_type = 'USER' AND actor_id IS NOT NULL) OR (actor_type = 'SYSTEM' AND actor_id IS NULL AND action = 'USER_CREATED')),
        CONSTRAINT ck_user_audit_before CHECK ((action = 'USER_CREATED' AND before_data IS NULL) OR (action <> 'USER_CREATED' AND before_data IS NOT NULL AND jsonb_typeof(before_data) = 'object')),
        CONSTRAINT ck_user_audit_after CHECK (jsonb_typeof(after_data) = 'object'),
        CONSTRAINT ck_user_audit_correlation CHECK (correlation_id ~ '[^[:space:]]')
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_user_audit_created ON ${schema}.user_audit_logs (created_at DESC, id DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_user_audit_user_created ON ${schema}.user_audit_logs (user_id, created_at DESC, id DESC)`,
    );
    await queryRunner.query(`
      CREATE FUNCTION ${schema}.reject_user_audit_mutation() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'user_audit_logs is append-only' USING ERRCODE = '55000';
      END;
      $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_user_audit_append_only
      BEFORE UPDATE OR DELETE OR TRUNCATE ON ${schema}.user_audit_logs
      FOR EACH STATEMENT EXECUTE FUNCTION ${schema}.reject_user_audit_mutation()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = this.schema(queryRunner);
    // Explicit rollback drops the tables and their data; never run on valuable data.
    await queryRunner.query(`DROP TABLE ${schema}.user_audit_logs`);
    await queryRunner.query(
      `DROP FUNCTION ${schema}.reject_user_audit_mutation()`,
    );
    await queryRunner.query(`DROP TABLE ${schema}.user_permissions`);
    await queryRunner.query(`DROP TABLE ${schema}.users`);
  }
}
