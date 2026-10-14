BEGIN;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "warehouses" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_warehouses" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_audit_logs" (
    "id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB NOT NULL,
    "correlation_id" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT "pk_warehouse_audit_logs" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_warehouses_code" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "idx_warehouses_status_created" ON "warehouses"("status", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "idx_warehouse_audit_created" ON "warehouse_audit_logs"("warehouse_id", "created_at" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "warehouse_audit_logs" ADD CONSTRAINT "fk_warehouse_audit_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Warehouse data constraints
ALTER TABLE "warehouses"
  ADD CONSTRAINT "chk_warehouses_status"
    CHECK ("status" IN ('ACTIVE', 'INACTIVE')),
  ADD CONSTRAINT "chk_warehouses_code"
    CHECK (
      "code" = upper(btrim("code"))
      AND "code" ~ '[^[:space:]]'
    ),
  ADD CONSTRAINT "chk_warehouses_name"
    CHECK ("name" ~ '[^[:space:]]'),
  ADD CONSTRAINT "chk_warehouses_address"
    CHECK (
      "address" ~ '[^[:space:]]'
      AND char_length("address") <= 1000
    );

-- Audit data constraints
ALTER TABLE "warehouse_audit_logs"
  ADD CONSTRAINT "chk_warehouse_audit_action"
    CHECK ("action" ~ '[^[:space:]]'),
  ADD CONSTRAINT "chk_warehouse_audit_before"
    CHECK (
      "before_data" IS NULL
      OR jsonb_typeof("before_data") = 'object'
    ),
  ADD CONSTRAINT "chk_warehouse_audit_after"
    CHECK (jsonb_typeof("after_data") = 'object'),
  ADD CONSTRAINT "chk_warehouse_audit_correlation"
    CHECK ("correlation_id" ~ '[^[:space:]]');

-- Warehouse code cannot change after creation
CREATE FUNCTION "reject_warehouse_code_change"()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."code" IS DISTINCT FROM OLD."code" THEN
    RAISE EXCEPTION 'warehouse code cannot be changed'
      USING ERRCODE = '23514',
            CONSTRAINT = 'chk_warehouses_code_immutable';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "trg_warehouse_code_immutable"
BEFORE UPDATE OF "code" ON "warehouses"
FOR EACH ROW
EXECUTE FUNCTION "reject_warehouse_code_change"();

-- Audit records are append-only
CREATE FUNCTION "reject_warehouse_audit_mutation"()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'warehouse_audit_logs is append-only'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "trg_warehouse_audit_append_only"
BEFORE UPDATE OR DELETE OR TRUNCATE ON "warehouse_audit_logs"
FOR EACH STATEMENT
EXECUTE FUNCTION "reject_warehouse_audit_mutation"();

COMMIT;
