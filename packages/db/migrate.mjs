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

  await sql.begin(async (tx) => {
    await tx`CREATE UNIQUE INDEX IF NOT EXISTS budget_members_budget_user_uq
      ON public.budget_members (budget_id, user_id)`;

    await tx`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'budget_members_role_allowed'
          AND conrelid = 'public.budget_members'::regclass
      ) THEN
        ALTER TABLE public.budget_members
          ADD CONSTRAINT budget_members_role_allowed
          CHECK (role IN ('owner', 'admin', 'editor', 'viewer')) NOT VALID;
      END IF;
    END $$`;
    await tx`ALTER TABLE public.budget_members VALIDATE CONSTRAINT budget_members_role_allowed`;

    await tx`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'budget_invitations_role_allowed'
          AND conrelid = 'public.budget_invitations'::regclass
      ) THEN
        ALTER TABLE public.budget_invitations
          ADD CONSTRAINT budget_invitations_role_allowed
          CHECK (role IN ('admin', 'editor', 'viewer')) NOT VALID;
      END IF;
    END $$`;
    await tx`ALTER TABLE public.budget_invitations VALIDATE CONSTRAINT budget_invitations_role_allowed`;

    await tx`ALTER TABLE public.transactions
      ADD COLUMN IF NOT EXISTS transfer_group_id uuid,
      ADD COLUMN IF NOT EXISTS transfer_peer_id uuid`;

    await tx`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'transactions_transfer_columns_paired'
          AND conrelid = 'public.transactions'::regclass
      ) THEN
        ALTER TABLE public.transactions
          ADD CONSTRAINT transactions_transfer_columns_paired
          CHECK ((transfer_group_id IS NULL) = (transfer_peer_id IS NULL)) NOT VALID;
      END IF;
    END $$`;
    await tx`ALTER TABLE public.transactions VALIDATE CONSTRAINT transactions_transfer_columns_paired`;

    await tx`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'transactions_transfer_peer_fk'
          AND conrelid = 'public.transactions'::regclass
      ) THEN
        ALTER TABLE public.transactions
          ADD CONSTRAINT transactions_transfer_peer_fk
          FOREIGN KEY (transfer_peer_id)
          REFERENCES public.transactions (id)
          DEFERRABLE INITIALLY DEFERRED
          NOT VALID;
      END IF;
    END $$`;
    await tx`ALTER TABLE public.transactions VALIDATE CONSTRAINT transactions_transfer_peer_fk`;

    await tx`CREATE INDEX IF NOT EXISTS transactions_transfer_group_idx
      ON public.transactions (transfer_group_id)
      WHERE transfer_group_id IS NOT NULL`;
  });

  console.log('Migrations 0004, 0005, 0006, authorization roles, and transfer pairs applied successfully');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
