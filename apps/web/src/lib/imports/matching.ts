import crypto from 'crypto';
import type { NormalizedImportTransaction, ImportRowMatch, ImportDecision } from './types';

// BR-IMP-010: Fingerprint for uniqueness in a single import
export function generateFingerprint(
  accountId: string, 
  date: string, 
  amountMinor: bigint, 
  normalizedDesc: string, 
  occurrence: number
): string {
  const hash = crypto.createHash('sha256');
  hash.update(`${accountId}|${date}|${amountMinor.toString()}|${normalizedDesc}|${occurrence}`);
  return hash.digest('hex');
}

// Simple Levenshtein distance for merchant similarity (BR-IMP-030)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  
  // Basic substring check for now if one is included in another
  if (s1.includes(s2) || s2.includes(s1)) return 0.7;
  
  return 0.0; // In a full prod version we'd use Levenshtein.
}

interface ExistingTransaction {
  id: string;
  externalId?: string | null;
  amountMinor: bigint;
  date: Date;
  payeeName?: string | null;
  memo?: string | null;
}

export function matchTransaction(
  incoming: NormalizedImportTransaction,
  existingTransactions: ExistingTransaction[]
): ImportRowMatch {
  let bestMatchId: string | undefined = undefined;
  let bestScore = 0;

  const incDate = incoming.postedDate || incoming.authorizedDate || '1970-01-01';
  const incTime = new Date(incDate).getTime();

  for (const existing of existingTransactions) {
    let score = 0;
    
    // 1. External ID match (BR-IMP-030: +0.40)
    if (incoming.externalId && existing.externalId === incoming.externalId) {
      score += 0.40;
    }

    // 2. Amount match (BR-IMP-030: +0.30)
    if (incoming.amountMinor === existing.amountMinor) {
      score += 0.30;
    }

    // 3. Date proximity (+0.15)
    const exTime = existing.date.getTime();
    const diffDays = Math.abs(exTime - incTime) / (1000 * 60 * 60 * 24);
    if (diffDays === 0) {
      score += 0.15;
    } else if (diffDays <= 3) {
      score += 0.10;
    } else if (diffDays <= 7) {
      score += 0.05;
    }

    // 4. Merchant similarity (+0.15)
    const similarity = calculateSimilarity(incoming.rawDescription, existing.payeeName || existing.memo || '');
    score += (similarity * 0.15);

    if (score > bestScore) {
      bestScore = score;
      bestMatchId = existing.id;
    }
  }

  // BR-IMP-031: Thresholds
  let decision: ImportDecision = 'NEW';
  
  if (bestScore >= 0.90) {
    // If it's a 100% exact match on external_id, we can safely call it DUPLICATE of an already imported one
    if (incoming.externalId && bestScore >= 0.7) {
        // Wait, if it's already in the DB with the same external_id, it's a DUPLICATE, not just a MATCH.
        // A match is for manual transactions entered by user that we are linking to.
        const match = existingTransactions.find(t => t.id === bestMatchId);
        if (match?.externalId === incoming.externalId) {
            decision = 'DUPLICATE';
        } else {
            decision = 'MATCHED';
        }
    } else {
        decision = 'MATCHED';
    }
  } else if (bestScore >= 0.60) {
    // Requires manual review (we'll mark as MATCHED but with lower score, UI shows as review)
    // Actually, decision = 'NEW' but we provide matchedTransactionId so UI shows "Review Match"
    decision = 'NEW'; 
  }

  // Multiply score by 1000 to store as integer
  const scoreInt = Math.round(bestScore * 1000);

  return {
    decision,
    matchedTransactionId: bestScore >= 0.60 ? bestMatchId : undefined,
    matchScore: scoreInt,
  };
}

export function deduplicateBatch(
    accountId: string,
    transactions: NormalizedImportTransaction[],
    existingDbTransactions: ExistingTransaction[]
): (NormalizedImportTransaction & ImportRowMatch)[] {
    const results: (NormalizedImportTransaction & ImportRowMatch)[] = [];
    const occurrences = new Map<string, number>();

    // Sort incoming so we process them deterministically 
    const sorted = [...transactions].sort((a, b) => a.rowIndex - b.rowIndex);

    // Keep track of matched DB IDs within this batch so we don't match two incoming to the same existing
    const usedExistingIds = new Set<string>();

    for (const row of sorted) {
        // 1. Calculate fingerprint
        const dateStr = row.postedDate || row.authorizedDate || '1970-01-01';
        const normDesc = (row.normalizedPayee || row.rawDescription).toLowerCase().trim();
        const baseKey = `${dateStr}|${row.amountMinor}|${normDesc}`;
        const occ = (occurrences.get(baseKey) || 0) + 1;
        occurrences.set(baseKey, occ);
        
        row.fingerprint = generateFingerprint(accountId, dateStr, row.amountMinor, normDesc, occ);

        // 2. Find match in existing DB (excluding ones we already matched in this batch)
        const availableExisting = existingDbTransactions.filter(t => !usedExistingIds.has(t.id));
        const matchResult = matchTransaction(row, availableExisting);

        if (matchResult.decision === 'MATCHED' || matchResult.decision === 'DUPLICATE') {
            if (matchResult.matchedTransactionId) {
                usedExistingIds.add(matchResult.matchedTransactionId);
            }
        }

        results.push({
            ...row,
            ...matchResult
        });
    }

    return results;
}
