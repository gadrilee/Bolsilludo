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
  type: text("type").notNull(), // 'checking', 'savings', 'credit', 'cash'
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
