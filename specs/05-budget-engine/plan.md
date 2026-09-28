# PLAN — Budget Engine (Spec 05)

## Architecture

We will create a pure TypeScript package in `packages/budget-engine`.
The core function will be `calculateMonthState` which takes:
- Previous month's state (if any)
- List of assignments for the current month
- List of activities (transactions) for the current month mapped by category
- Total inflows to "Ready to Assign"

And outputs:
- RTA for the month
- A map of Category ID to its state (Assigned, Activity, Available).

## Stack
- Node.js / TypeScript.
- Vitest for testing.
- Dependency on `@bolsilludo/money` for safe integer arithmetic.
