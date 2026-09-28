import { pgTable, text, timestamp, uuid, char, integer, bigint } from "drizzle-orm/pg-core";

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

// 3. Transactions (Skeleton for now, will be expanded in Tx Engine spec)
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id").references(() => budgets.id).notNull(),
  accountId: uuid("account_id").references(() => accounts.id).notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(), // P2 Integer Money
  payee: text("payee"),
  memo: text("memo"),
  voidedAt: timestamp("voided_at", { withTimezone: true }), // P3 Immutable History
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
