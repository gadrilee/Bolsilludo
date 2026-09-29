ALTER TABLE "accounts" ADD COLUMN "opening_balance" bigint;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "linked_account_id" uuid;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "is_credit_card_payment" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_linked_account_id_accounts_id_fk" FOREIGN KEY ("linked_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;