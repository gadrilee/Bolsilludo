import { NextResponse } from 'next/server';
import { db, transactions, transactionSplits, accounts, categories } from '@bolsilludo/db';
import { eq, and } from 'drizzle-orm';
import { requireBudgetRole } from '@/lib/auth/authorization';

function escapeCsvCell(cell: string | null | undefined): string {
  if (!cell) return '';
  let str = String(cell);
  
  // Bug #26: Formula injection prevention
  // Cells starting with =, +, - or @ must be prefixed with '
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  
  // If string contains comma, quote or newline, wrap in quotes and escape internal quotes
  if (/[,"\n]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const budgetId = searchParams.get('budgetId');
    
    if (!budgetId) return NextResponse.json({ error: 'Missing budgetId' }, { status: 400 });

    await requireBudgetRole(budgetId, 'editor');

    const allTxs = await db.select({
      id: transactions.id,
      date: transactions.date,
      payeeName: transactions.payeeName,
      memo: transactions.memo,
      amount: transactions.amountMinor,
      status: transactions.status,
      accountName: accounts.name,
      categoryName: categories.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(transactionSplits, eq(transactions.id, transactionSplits.transactionId))
    .leftJoin(categories, eq(transactionSplits.categoryId, categories.id))
    .where(eq(transactions.budgetId, budgetId));

    let csvContent = 'ID,Fecha,Cuenta,Beneficiario,Categoria,Monto,Estado,Memo\n';
    
    for (const tx of allTxs) {
      const dateStr = new Date(tx.date).toISOString().split('T')[0];
      const amountStr = (Number(tx.amount) / 100).toFixed(2);
      
      const row = [
        tx.id,
        dateStr,
        tx.accountName,
        tx.payeeName,
        tx.categoryName || 'Ready to Assign',
        amountStr,
        tx.status,
        tx.memo
      ].map(escapeCsvCell).join(',');
      
      csvContent += row + '\n';
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="bolsilludo_export.csv"',
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
