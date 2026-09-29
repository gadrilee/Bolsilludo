export interface NormalizedImportTransaction {
  externalId?: string; // Original ID from bank (if available)
  merchantName?: string;
  rawDescription: string; // The raw unedited description (BR-PAY-007)
  normalizedPayee?: string;
  amountMinor: bigint; // Signed minor units (+ is inflow to account)
  currency: string;
  authorizedDate?: string; // YYYY-MM-DD
  postedDate?: string; // YYYY-MM-DD
  pending: boolean;
  
  // Internal fingerprint fields
  fingerprint?: string;
  rowIndex: number;
}

export type ImportDecision = 'NEW' | 'MATCHED' | 'REJECTED' | 'DUPLICATE';

export interface ImportRowMatch {
  decision: ImportDecision;
  matchedTransactionId?: string;
  matchScore?: number;
  suggestedCategoryId?: string;
}

export interface BankProvider {
  // We'll skip connect/disconnect in Phase 1 since we're using manual adapters
  // listAccounts(connectionId: string): Promise<ExternalAccount[]>;
  // syncTransactions(connectionId: string): Promise<NormalizedImportTransaction[]>;
  // getStatus(connectionId: string): Promise<ConnectionStatus>;
}
