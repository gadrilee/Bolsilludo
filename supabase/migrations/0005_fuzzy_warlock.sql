CREATE TABLE "scheduled_transactions" (
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
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "scheduled_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "occurrence_date" date;--> statement-breakpoint
ALTER TABLE "scheduled_transactions" ADD CONSTRAINT "scheduled_transactions_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_transactions" ADD CONSTRAINT "scheduled_transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_transactions" ADD CONSTRAINT "scheduled_transactions_payee_id_payees_id_fk" FOREIGN KEY ("payee_id") REFERENCES "public"."payees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_transactions" ADD CONSTRAINT "scheduled_transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;