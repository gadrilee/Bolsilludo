import { NextResponse } from 'next/server';
import { db } from '@bolsilludo/db';
import { budgets } from '@bolsilludo/db';
import { processDueScheduled } from '@/app/actions/scheduled';

// This could be triggered by Vercel Cron
export async function GET(request: Request) {
  try {
    const allBudgets = await db.select({ id: budgets.id }).from(budgets);
    
    for (const b of allBudgets) {
      await processDueScheduled(b.id);
    }

    return NextResponse.json({ success: true, processed: allBudgets.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
