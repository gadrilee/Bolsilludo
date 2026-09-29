'use server';

import { db } from '@bolsilludo/db';
import { 
  importBatches, 
  importRows, 
  transactions, 
  rawBankPayloads, 
  accounts 
} from '@bolsilludo/db';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import { deduplicateBatch } from '@/lib/imports/matching';
import type { NormalizedImportTransaction } from '@/lib/imports/types';

export async function createImportBatch(
  budgetId: string,
  accountId: string,
  sourceType: string,
  filename: string,
  fileContent: string,
  parsedRows: NormalizedImportTransaction[],
  userId: string
) {
  // BR-IMP-011: File checksum and uniqueness check
  const checksum = crypto.createHash('sha256').update(fileContent).digest('hex');
  
  const existingBatch = await db.select({ id: importBatches.id })
    .from(importBatches)
    .where(
      and(
        eq(importBatches.accountId, accountId),
        eq(importBatches.checksum, checksum),
        eq(importBatches.status, 'APPLIED')
      )
    ).limit(1);

  if (existingBatch.length > 0) {
    throw new Error('IMPORT_BATCH_ALREADY_APPLIED');
  }

  // Fetch existing transactions for this account for deduplication (only recent ones realistically, but all for now)
  const existingTxs = await db.select({
    id: transactions.id,
    externalId: transactions.externalId,
    amountMinor: transactions.amountMinor,
    date: transactions.date,
    payeeName: transactions.payeeName,
    memo: transactions.memo
  }).from(transactions)
    .where(eq(transactions.accountId, accountId));

  // Run deduplication and matching logic
  const processedRows = deduplicateBatch(accountId, parsedRows, existingTxs);

  // Calculate stats
  const totalRows = processedRows.length;
  let duplicateRows = 0;
  let acceptedRows = 0; // Means NEW or MATCHED and ready
  
  processedRows.forEach(r => {
    if (r.decision === 'DUPLICATE') duplicateRows++;
    else if (r.decision === 'NEW' || r.decision === 'MATCHED') acceptedRows++;
  });

  // DB Insert
  return await db.transaction(async (tx) => {
    const [batch] = await tx.insert(importBatches).values({
      budgetId,
      accountId,
      sourceType,
      filename,
      checksum,
      status: 'REVIEW', // Ready for user review
      totalRows,
      acceptedRows,
      duplicateRows,
      rejectedRows: 0,
      idempotencyKey: crypto.randomUUID(),
      createdBy: userId,
    }).returning();

    // Store raw payload (if it was an API sync, but here we store file content)
    await tx.insert(rawBankPayloads).values({
      budgetId,
      provider: sourceType,
      payload: fileContent,
    });

    if (processedRows.length > 0) {
      await tx.insert(importRows).values(
        processedRows.map(r => ({
          batchId: batch.id,
          budgetId,
          rowIndex: r.rowIndex,
          fingerprint: r.fingerprint!,
          externalId: r.externalId,
          merchantName: r.merchantName,
          rawDescription: r.rawDescription,
          normalizedPayee: r.normalizedPayee,
          amountMinor: r.amountMinor,
          currency: r.currency,
          authorizedDate: r.authorizedDate,
          postedDate: r.postedDate,
          pending: r.pending,
          decision: r.decision,
          matchedTransactionId: r.matchedTransactionId,
          matchScore: r.matchScore,
        }))
      );
    }

    revalidatePath('/dashboard');
    return batch.id;
  });
}

export async function getPendingImportBatch(accountId: string) {
  const batch = await db.select().from(importBatches)
    .where(
      and(
        eq(importBatches.accountId, accountId),
        inArray(importBatches.status, ['REVIEW', 'PARSED'])
      )
    ).orderBy(desc(importBatches.createdAt)).limit(1);
    
  if (!batch.length) return null;
  
  const rows = await db.select().from(importRows)
    .where(eq(importRows.batchId, batch[0].id))
    .orderBy(importRows.rowIndex);
    
  return { batch: batch[0], rows };
}

export async function resolveImportRow(rowId: string, decision: 'NEW' | 'MATCHED' | 'REJECTED' | 'DUPLICATE') {
  await db.update(importRows)
    .set({ decision })
    .where(eq(importRows.id, rowId));
  revalidatePath('/dashboard');
}

export async function commitImportBatch(batchId: string) {
  return await db.transaction(async (tx) => {
    const [batch] = await tx.select().from(importBatches).where(eq(importBatches.id, batchId));
    if (!batch || batch.status === 'APPLIED') return;

    const rowsToApply = await tx.select().from(importRows)
      .where(
        and(
          eq(importRows.batchId, batchId),
          inArray(importRows.decision, ['NEW', 'MATCHED']) // Exclude DUPLICATE and REJECTED
        )
      );

    // BR-IMP-020: pending external transactions do not create real ledger transactions until they are posted.
    // However, for MVP, we'll only import posted ones (our parsers currently set pending=false).
    
    const newTransactions = rowsToApply.filter(r => r.decision === 'NEW' && !r.pending);
    
    if (newTransactions.length > 0) {
      await tx.insert(transactions).values(
        newTransactions.map(r => ({
          budgetId: batch.budgetId,
          accountId: batch.accountId,
          date: new Date(r.postedDate || r.authorizedDate || new Date().toISOString()),
          amountMinor: r.amountMinor,
          payeeName: r.normalizedPayee || r.rawDescription,
          memo: r.rawDescription,
          externalId: r.externalId,
          status: 'cleared', // They are posted external, so cleared
          // Note: FR-IMP-005 says "unapproved". We'd need an `isApproved` column in transactions.
          // For now, we rely on the cleared status or a future flag. 
        }))
      );
    }
    
    // For MATCHED transactions, we could update the existing transaction's externalId to link them.
    const matchedTransactions = rowsToApply.filter(r => r.decision === 'MATCHED' && r.matchedTransactionId);
    for (const matched of matchedTransactions) {
      if (matched.externalId) {
        await tx.update(transactions)
          .set({ externalId: matched.externalId, status: 'cleared' })
          .where(eq(transactions.id, matched.matchedTransactionId!));
      }
    }

    await tx.update(importBatches)
      .set({ status: 'APPLIED', completedAt: new Date() })
      .where(eq(importBatches.id, batchId));
      
    // Cleanup staging rows after apply (optional, but good practice A4)
    await tx.delete(importRows).where(eq(importRows.batchId, batchId));

    revalidatePath('/dashboard');
  });
}

export async function cancelImportBatch(batchId: string) {
  await db.transaction(async (tx) => {
    await tx.update(importBatches)
      .set({ status: 'CANCELLED', completedAt: new Date() })
      .where(eq(importBatches.id, batchId));
    await tx.delete(importRows).where(eq(importRows.batchId, batchId));
  });
  revalidatePath('/dashboard');
}
