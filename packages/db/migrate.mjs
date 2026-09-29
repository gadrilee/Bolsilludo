import postgres from 'postgres';

const sql = postgres('postgresql://postgres.niynkiswjetejtyebrkg:2m2QAXySHQEwz27R@aws-0-us-west-2.pooler.supabase.com:6543/postgres', { max: 1 });

async function run() {
  // Migration 0003_flaky_blink.sql
  await sql`ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "opening_balance" bigint`;
  
  await sql`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "linked_account_id" uuid`;
  
  await sql`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "is_credit_card_payment" integer DEFAULT 0 NOT NULL`;
  
  await sql`
    ALTER TABLE "categories" 
    ADD CONSTRAINT "categories_linked_account_id_accounts_id_fk" 
    FOREIGN KEY ("linked_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action
  `.catch(e => console.log('Constraint may already exist:', e.message));

  console.log('Migration 0003 applied successfully');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
