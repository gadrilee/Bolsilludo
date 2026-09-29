CREATE TABLE "import_batches" (
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
--> statement-breakpoint
CREATE TABLE "import_rows" (
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
--> statement-breakpoint
CREATE TABLE "raw_bank_payloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"connection_id" uuid,
	"payload" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retention_until" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "opening_balance";