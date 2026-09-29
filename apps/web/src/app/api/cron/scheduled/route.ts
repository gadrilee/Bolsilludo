import { NextResponse } from 'next/server';
import { db } from '@bolsilludo/db';
import { budgets } from '@bolsilludo/db';
import { processDueScheduled } from '@/app/actions/scheduled';
import { isValidCronSecret } from '@/lib/auth/cron';

// This could be triggered by Vercel Cron
export async function GET(request: Request) {
  const authorization = request.headers.get('authorization');
  const [scheme, suppliedSecret] = authorization?.split(' ', 2) ?? [];
  if (scheme !== 'Bearer' || !isValidCronSecret(suppliedSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron is not configured' }, { status: 503 });
  }

  try {
    const allBudgets = await db.select({ id: budgets.id }).from(budgets);
    
    for (const b of allBudgets) {
      await processDueScheduled(b.id, cronSecret);
    }

    return NextResponse.json({ success: true, processed: allBudgets.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
