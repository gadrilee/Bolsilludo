# SPEC 05 — Budget Engine

## Goal
Establish a deterministic engine to calculate the state of the budget for any given month, specifically focusing on "Ready to Assign" (RTA) and category availability.

## Scope
- `packages/budget-engine`: A package containing pure functions to process arrays of transactions, budget allocations, and previous month states to output the current month's state.

## Business Rules (Constitution & Invariants)
- **P5 Deterministic Engine**: The engine must be a set of pure functions. Given the same inputs, the output is always identical. No database queries inside the engine.
- **I4 Category Available**: `available = prev_available + assigned + activity + transfers_in - transfers_out + rollover`
- **I5 Ready to Assign (RTA)**: `RTA = total_liquid_cash - total_assigned_all_months` (simplified canonical representation). For a specific month, it's the unallocated inflows up to that month minus all assignments.

## Acceptance Criteria
- Engine handles basic category available calculation.
- Engine handles RTA calculation correctly, ensuring money is not created out of thin air.
- Engine handles month-to-month rollovers (positive balances carry over, negative balances do not roll over directly into the category unless specified by a debt rule, normally they reduce the next month's RTA).
- Extensive unit and property tests verifying the invariants.
