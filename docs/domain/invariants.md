# Domain Invariants — Bolsilludo

> Version: 1.0.0 | Iteration: I1 | Date: 2026-09-28
> These mathematical and logical rules must be enforced by the database, API layer, and tested via property-based tests.

---

## I1 — Split Total
For any transaction that contains splits, the sum of the split amounts must exactly equal the parent transaction amount.
```text
SUM(transaction_splits.amount_minor) = transaction.amount_minor
```

## I2 — Transfer Equivalence (Symmetry)
A transfer consists of a linked pair of transactions (an outflow from Account A and an inflow to Account B). Their absolute values must be equal.
```text
outflow(account_A) + inflow(account_B) = 0
ABS(outflow.amount_minor) = ABS(inflow.amount_minor)
```
They must also share the same `transfer_group_id`.

## I3 — Account Balance
The balance of an account at any given time is the sum of its opening balance and all posted (non-voided) transactions.
```text
account_balance = opening_balance + SUM(posted_transactions.amount_minor)
```

## I4 — Category Available (Monthly State)
The available money in a category for a given month is calculated based on its history and current allocations.
```text
available_end_month = available_start_month 
                      + assigned 
                      + activity 
                      + transfers_in 
                      - transfers_out 
                      + rollover
```
*(Note: Whether `rollover` is materialized or derived is an implementation detail, but the math must hold).*

## I5 — Ready to Assign (RTA) Canonical Formula
There is exactly one source of truth for unassigned money. The system cannot invent money.
```text
RTA = total_liquid_cash_available
      - money_already_assigned_to_categories
      - committed_outflows_or_credit_card_reserves
```
A budget in a future month cannot have a higher RTA than the current month unless new future income is explicitly scheduled/budgeted.

## I6 — Reconciliation Lock
When an account is reconciled up to a specific date/transaction, the sum of the ledger must match the reported bank balance.
```text
SUM(ledger_up_to_reconciliation) = reported_bank_balance
```
If there is a discrepancy, an explicit adjustment transaction must be registered to make the math balance. Reconciled transactions should be locked from modification.

## I7 — Currency Isolation
Monetary amounts in different currencies must **never** be directly added or subtracted.
```text
USD + BOB = INVALID
```
Calculations across currencies require an explicit FX conversion using historical or current exchange rates, producing a new value in the target base currency.

## I8 — Immutable Audit Trail
A posted transaction cannot be physically deleted. If it was an error, it must be `voided` or countered with a compensating transaction, ensuring the audit log accurately reflects the history of user actions.
