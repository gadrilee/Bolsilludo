# ADR-C: Default Base Currency

## Context
The application is multi-currency by design (Phase 16). However, the initial engine and user onboarding require a default base currency to anchor reports and net worth calculations.

## Options
1. **(Recommended)** **BOB (Boliviano)**: Use BOB as the default currency for the reference environment, seed data, and initial onboarding.
2. **USD (US Dollar)**: Standardize on USD globally.

## Proposed Decision: Option 1
We will use **BOB** as the default base currency.
- **Why**: The project plan (PlanInit.md) explicitly references BOB in its examples and ADR notes. Adopting BOB ensures our `packages/money` logic correctly handles 2-decimal precision reliably and aligns with the project's foundational examples. Users can still change their base currency per budget workspace.
