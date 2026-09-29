import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres';
const sql = postgres(connectionString, { max: 1 });

async function run() {
  await sql`
    CREATE TABLE IF NOT EXISTS "import_batches" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "budget_id" uuid NOT NULL,
      "account_id" uuid NOT NULL,
      "source_type" text NOT NULL,
      "filename" text,
      "checksum" text,
      "status" text NOT NULL,
      "total_rows" integer DEFAULT 0 NOT NULL,
      "accepted_rows" integer DEFAULT 0 NOT NULL,
      "duplicate_rows" integer DEFAULT 0 NOT NULL,
      "rejected_rows" integer DEFAULT 0 NOT NULL,
      "retry_count" integer DEFAULT 0 NOT NULL,
      "next_retry_at" timestamp with time zone,
      "last_error" text,
      "idempotency_key" uuid NOT NULL,
      "created_by" uuid NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "completed_at" timestamp with time zone
    );
  `;
  
  await sql`
    CREATE TABLE IF NOT EXISTS "import_rows" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "batch_id" uuid NOT NULL,
      "budget_id" uuid NOT NULL,
      "row_index" integer NOT NULL,
      "fingerprint" text NOT NULL,
      "external_id" text,
      "merchant_name" text,
      "raw_description" text,
      "normalized_payee" text,
      "amount_minor" bigint NOT NULL,
      "currency" char(3) NOT NULL,
      "authorized_date" date,
      "posted_date" date,
      "pending" boolean DEFAULT false NOT NULL,
      "decision" text DEFAULT 'NEW' NOT NULL,
      "matched_transaction_id" uuid,
      "match_score" integer,
      "suggested_category_id" uuid
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "raw_bank_payloads" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "budget_id" uuid NOT NULL,
      "provider" text NOT NULL,
      "connection_id" uuid,
      "payload" text NOT NULL,
      "received_at" timestamp with time zone DEFAULT now() NOT NULL,
      "retention_until" timestamp with time zone
    );
  `;
  
  await sql`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "external_id" text`;
  
  await sql`
    ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action
  `.catch(e => console.log('Constraint may already exist:', e.message));

  await sql`
    ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action
  `.catch(e => console.log('Constraint may already exist:', e.message));

  await sql`
    ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action
  `.catch(e => console.log('Constraint may already exist:', e.message));

  // 0005
  await sql`
    CREATE TABLE IF NOT EXISTS "scheduled_transactions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "budget_id" uuid NOT NULL,
      "account_id" uuid NOT NULL,
      "payee_id" uuid,
      "category_id" uuid,
      "amount_minor" bigint NOT NULL,
      "currency" char(3) DEFAULT 'BOB' NOT NULL,
      "memo" text DEFAULT '' NOT NULL,
      "frequency_type" text NOT NULL,
      "frequency_rule" text DEFAULT '{}' NOT NULL,
      "start_at" date NOT NULL,
      "end_at" date,
      "next_occurrence_at" date,
      "last_occurrence_at" date,
      "auto_post" boolean DEFAULT false NOT NULL,
      "status" text DEFAULT 'ACTIVE' NOT NULL,
      "reimbursement_group_id" uuid,
      "archived_at" timestamp with time zone,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      "version" integer DEFAULT 1 NOT NULL
    );
  `;
  await sql`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "scheduled_id" uuid`.catch(() => {});
  await sql`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "occurrence_date" date`.catch(() => {});

  // 0006
  await sql`
    CREATE TABLE IF NOT EXISTS "audit_events" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "budget_id" uuid NOT NULL,
      "actor_user_id" uuid,
      "entity_type" text NOT NULL,
      "entity_id" uuid,
      "action" text NOT NULL,
      "details" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "budget_invitations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "budget_id" uuid NOT NULL,
      "email" text NOT NULL,
      "role" text NOT NULL,
      "token_hash" text NOT NULL UNIQUE,
      "invited_by" uuid NOT NULL,
      "invited_at" timestamp with time zone DEFAULT now() NOT NULL,
      "expires_at" timestamp with time zone NOT NULL,
      "accepted_at" timestamp with time zone,
      "revoked_at" timestamp with time zone
    );
  `;

  console.log('Migrations 0004, 0005, 0006 applied successfully');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
