# Domain Glossary — Bolsilludo

> Version: 1.0.0 | Iteration: I1 | Date: 2026-09-28
> Canonical glossary of domain terms to be used consistently across UI, API, DB, and code.

## Core Concepts

- **Budget**: A plan for allocating available money to specific purposes (categories) across time. Also serves as a "workspace" bounding accounts and categories.
- **Account**: A container holding money (e.g., Bank Account, Credit Card, Cash, Investment). Accounts can be "on-budget" (cash backing the budget) or "off-budget" (tracking assets/liabilities).
- **Category**: A specific bucket or purpose for money (e.g., Groceries, Rent). Money is assigned to categories and spent from them.
- **Category Group**: A logical grouping of related categories (e.g., "Fixed Expenses", "Daily Living").
- **Transaction**: A record of money moving in (income), out (expense), or between accounts (transfer).
- **Split Transaction**: A single transaction divided across multiple categories. The sum of the splits must equal the total transaction amount.
- **Transfer**: A movement of money between two accounts within the same budget.
- **Payee**: The entity (person or business) to whom money is paid or from whom money is received.

## Budgeting Mechanisms

- **Ready to Assign (RTA)**: The pool of available cash that has not yet been allocated to any category.
- **Assigned**: The amount of money explicitly allocated to a category in a given month.
- **Activity**: The total amount of spending or direct inflows in a category during a given month.
- **Available**: The current amount of money sitting in a category, ready to be spent. (`Available = Prior Available + Assigned + Activity`).
- **Rollover**: The automatic carry-forward of any remaining positive Available balance from a category at the end of the month into the next month.
- **Overspending**: When a category's Available balance drops below zero due to Activity exceeding Assigned + Prior Available.
- **Goal / Target**: A planned savings or spending objective for a category (e.g., Need $500 by December).

## Advanced Mechanics

- **Credit Card Payment Category**: A specialized category that automatically tracks money reserved to pay off a credit card balance. When a budgeted purchase is made on a credit card, the money moves from the spending category to this payment category.
- **Credit Card Float**: A situation where the credit card balance exceeds the money reserved in the Credit Card Payment Category, indicating unbacked debt.
- **Reconciliation**: The process of comparing the ledger (internal transaction list) against the bank's reported balance to ensure accuracy.
- **Settlement**: The resolution of a shared expense (e.g., paying back a friend who covered a dinner).
- **Net Worth**: Total Assets minus Total Liabilities, potentially across multiple currencies.
- **Voided**: A transaction that has been canceled or reversed but remains in the database for immutable audit history.

---
*If a term is not in this glossary, it should be added before being heavily utilized in code.*
