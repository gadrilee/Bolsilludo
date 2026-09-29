import { pgTable, text, timestamp, uuid, char, integer, bigint, boolean, date, smallint } from "drizzle-orm/pg-core";

// 1. Core Identity
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  baseCurrency: char("base_currency", { length: 3 }).notNull().default("BOB"), // ADR-C
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const budgets = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Accounts
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id").references(() => budgets.id).notNull(),
  name: text("name").notNull(),
  // type: 'checking' | 'savings' | 'credit_card' | 'cash' | 'loan' (FR-CC-001, ADR-G17)
  type: text("type").notNull(),
  isOffBudget: integer("is_off_budget").notNull().default(0), // 0 or 1
  currency: char("currency", { length: 3 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

// 3. Payees
export const payees = pgTable("payees", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id").references(() => budgets.id).notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Transactions 
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id").references(() => budgets.id).notNull(),
  accountId: uuid("account_id").references(() => accounts.id).notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(), // P2 Integer Money
  payeeId: uuid("payee_id").references(() => payees.id),
  payeeName: text("payee_name"), // Optional fallback
  memo: text("memo"),
  transferGroupId: uuid("transfer_group_id"),
  transferPeerId: uuid("transfer_peer_id"),
  externalId: text("external_id"), // Added for imports matching
  scheduledId: uuid("scheduled_id"),
  occurrenceDate: date("occurrence_date"),
  status: text("status").notNull().default("cleared"), // 'pending', 'cleared', 'reconciled'
  voidedAt: timestamp("voided_at", { withTimezone: true }), // P3 Immutable History
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4.1 Transaction Splits
export const transactionSplits = pgTable("transaction_splits", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").references(() => transactions.id).notNull(),
  categoryId: uuid("category_id"), // Can be null if it's 'Ready to Assign' / Income
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
});

// 4. Budget Members
export const budgetMembers = pgTable("budget_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id").references(() => budgets.id).notNull(),
  userId: uuid("user_id").notNull(), // References auth.users or public.profiles
  role: text("role").notNull().default("editor"), // 'owner', 'editor', 'viewer'
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
});

// 5. Category Groups
export const categoryGroups = pgTable("category_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id").references(() => budgets.id).notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isHidden: integer("is_hidden").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 6. Categories
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => categoryGroups.id).notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isHidden: integer("is_hidden").notNull().default(0),
  icon: text("icon"), // emoji or icon name
  // BR-CC-001: explicit link — credit card account ID → payment category
  // NEVER identify payment category by name.
  linkedAccountId: uuid("linked_account_id").references(() => accounts.id),
  // System flag: payment categories are auto-managed, users can't assign them directly
  isCreditCardPayment: integer("is_credit_card_payment").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 7. Category Allocations (Assigned Money per Month)
export const categoryAllocations = pgTable("category_allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  month: text("month").notNull(), // Format 'YYYY-MM'
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 8. Goals (Spec 06)
export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id").references(() => budgets.id, { onDelete: "cascade" }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  cadence: text("cadence").notNull(), // 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM'
  behavior: text("behavior").notNull(), // 'SET_ASIDE', 'REFILL_UP_TO', 'HAVE_A_BALANCE'
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  repeatEnabled: boolean("repeat_enabled").notNull().default(false),
  repeatInterval: integer("repeat_interval"),
  repeatUnit: text("repeat_unit"), // 'WEEK', 'MONTH', 'YEAR'
  weekStartDay: smallint("week_start_day"), // 0-6
  snoozedMonth: date("snoozed_month"), // only 1st of month
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  version: integer("version").notNull().default(1),
});

// 9. Import Batches
export const importBatches = pgTable("import_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id").references(() => budgets.id, { onDelete: "cascade" }).notNull(),
  accountId: uuid("account_id").references(() => accounts.id).notNull(),
  sourceType: text("source_type").notNull(), // 'CSV','OFX','QFX','YNAB_CSV','BANK_SYNC','MANUAL'
  filename: text("filename"),
  checksum: text("checksum"),
  status: text("status").notNull(), // 'PENDING','PARSED','REVIEW','APPLIED','FAILED','CANCELLED'
  totalRows: integer("total_rows").notNull().default(0),
  acceptedRows: integer("accepted_rows").notNull().default(0),
  duplicateRows: integer("duplicate_rows").notNull().default(0),
  rejectedRows: integer("rejected_rows").notNull().default(0),
  retryCount: integer("retry_count").notNull().default(0),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  lastError: text("last_error"),
  idempotencyKey: uuid("idempotency_key").notNull(),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// 10. Scheduled Transactions
export const scheduledTransactions = pgTable("scheduled_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id").references(() => budgets.id, { onDelete: "cascade" }).notNull(),
  accountId: uuid("account_id").references(() => accounts.id).notNull(),
  payeeId: uuid("payee_id").references(() => payees.id),
  categoryId: uuid("category_id").references(() => categories.id),
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
  currency: char("currency", { length: 3 }).notNull().default('BOB'),
  memo: text("memo").notNull().default(''),
  frequencyType: text("frequency_type").notNull(), // 'ONCE','WEEKLY','BIWEEKLY','MONTHLY','YEARLY','CUSTOM'
  frequencyRule: text("frequency_rule").notNull().default('{}'), // json representation
  startAt: date("start_at").notNull(),
  endAt: date("end_at"),
  nextOccurrenceAt: date("next_occurrence_at"),
  lastOccurrenceAt: date("last_occurrence_at"),
  autoPost: boolean("auto_post").notNull().default(false),
  status: text("status").notNull().default('ACTIVE'), // 'ACTIVE','PAUSED','ENDED'
  reimbursementGroupId: uuid("reimbursement_group_id"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  version: integer("version").notNull().default(1),
});

// 9.1 Import Rows (Staging)
export const importRows = pgTable("import_rows", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").references(() => importBatches.id, { onDelete: "cascade" }).notNull(),
  budgetId: uuid("budget_id").notNull(),
  rowIndex: integer("row_index").notNull(),
  fingerprint: text("fingerprint").notNull(),
  externalId: text("external_id"),
  merchantName: text("merchant_name"),
  rawDescription: text("raw_description"),
  normalizedPayee: text("normalized_payee"),
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
  currency: char("currency", { length: 3 }).notNull(),
  authorizedDate: date("authorized_date"),
  postedDate: date("posted_date"),
  pending: boolean("pending").notNull().default(false),
  decision: text("decision").notNull().default('NEW'), // 'NEW','MATCHED','REJECTED','DUPLICATE'
  matchedTransactionId: uuid("matched_transaction_id"), // References transactions (but not strict FK as transaction might not exist yet or we just store UUID)
  matchScore: integer("match_score"), // multiplied by 1000 for numeric(4,3) simulation or just decimal. Let's use real or text if we want exactly numeric. Let's use integer to store score out of 1000. 1000 = 1.000
  suggestedCategoryId: uuid("suggested_category_id"),
});

// 9.2 Raw Bank Payloads
export const rawBankPayloads = pgTable("raw_bank_payloads", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id").notNull(),
  provider: text("provider").notNull(),
  connectionId: uuid("connection_id"),
  payload: text("payload").notNull(), // storing json as text in drizzle, or we can import jsonb if needed (let's use text and JSON.parse)
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  retentionUntil: timestamp("retention_until", { withTimezone: true }),
});

// 12.1 Budget Invitations
export const budgetInvitations = pgTable("budget_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id").references(() => budgets.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(), // 'admin', 'editor', 'viewer'
  tokenHash: text("token_hash").notNull().unique(),
  invitedBy: uuid("invited_by").notNull(),
  invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

// 12.2 Audit Events (Optional for MVP, but good for feed)
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id").references(() => budgets.id, { onDelete: "cascade" }).notNull(),
  actorUserId: uuid("actor_user_id"),
  entityType: text("entity_type").notNull(), // e.g., 'transaction', 'member', 'budget'
  entityId: uuid("entity_id"),
  action: text("action").notNull(), // e.g., 'created', 'updated', 'deleted', 'invited'
  details: text("details"), // JSON payload as text
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

