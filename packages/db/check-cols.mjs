import postgres from 'postgres';

const sql = postgres('postgresql://postgres.niynkiswjetejtyebrkg:2m2QAXySHQEwz27R@aws-0-us-west-2.pooler.supabase.com:6543/postgres', { max: 1 });

async function run() {
  const cols = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'accounts' AND column_name = 'opening_balance'
  `;
  console.log('opening_balance exists:', cols.length > 0);
  
  const catCols = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name IN ('linked_account_id', 'is_credit_card_payment')
  `;
  console.log('categories new cols:', catCols.map(c => c.column_name));

  process.exit(0);
}

run().catch(console.error);
