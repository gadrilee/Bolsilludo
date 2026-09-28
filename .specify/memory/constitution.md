# CONSTITUTION — BOLSILLUDO
> Version: 1.0.0 | Iteration: I0 | Date: 2026-09-28
> This constitution is the supreme authority for all product and technical decisions.
> Any conflict between a spec, plan or task and this document is resolved in favor of
> the constitution. Changes require explicit owner approval.

---

## P1 — Financial Correctness First

All monetary logic must prioritize exactness over visual convenience.
No shortcut, approximation, or optimization may compromise the correctness of a
financial calculation. When in doubt, be exact.

## P2 — Integer Money

**Never use `float` to store or compute money.**

All monetary amounts are stored as integers in the smallest unit of the currency:

```text
amount_minor  INTEGER / BIGINT   (e.g. 1025 → 10.25 USD)
currency      CHAR(3)            (ISO 4217)
```

The precision for each currency (number of decimal places) is read from the
`currencies` table — never hardcoded as 2.

Examples:
- 10.25 USD → `amount_minor = 1025`, `currency = "USD"`
- 50.00 BOB → `amount_minor = 5000`, `currency = "BOB"`

Rounding policy: see `docs/domain/financial-model.md §Rounding`.

## P3 — Immutable Financial History

A confirmed transaction is **never physically deleted**.
Use `voided_at`, `voided_by`, `void_reason`, or compensating entries.

## P4 — Double-Entry Where Appropriate

Operations affecting two accounts maintain logical balance.
`ABS(outflow) = ABS(inflow)` (invariant I2).

## P5 — Deterministic Budget Engine

Same state + transactions + allocations + goals → identical result, always.
Engine functions are pure: no side effects, no DB reads inside calculation.

## P6 — Explainability

Every automatic recommendation must explain:
1. What it observed (data source + IDs)
2. Which rule it applied (rule ID or model version)
3. What it proposes (diff of proposed state)
4. What the impact would be (budget/account deltas)

## P7 — Human Approval for Financial Actions

The AI/automation layer **may never** transfer real money, make payments,
modify bank account details, accept debt, or sell assets without **explicit,
per-action user authorization**.

AI state machine: `DRAFT → PROPOSED → APPROVED → APPLIED` (or `REJECTED / EXPIRED`).

## P8 — Privacy by Design

Financial data is extremely sensitive. Collect only what is necessary.
Logs never contain passwords, credentials, tokens, or full financial payloads.
Users can export, delete, and disconnect all their data.

## P9 — Offline Friendly

Registering a purchase must be possible without internet.
Local store + sync queue. Conflicts are surfaced to user, never silently overwritten.

## P10 — Accessibility

WCAG 2.2 AA minimum for all user-facing interfaces.
Contrast ratios enforced by CI. `prefers-reduced-motion` and `prefers-contrast: more` respected.

## P11 — Mobile First

Quick transaction entry completable in **less than 10 seconds** on mobile.

## P12 — No Spreadsheet Dependency

The table view exists for precision, not as the primary interface.
Primary interface surfaces decisions and actions, not rows.

## P13 — Brand & Tokens Single Source of Truth

Colors, radii, shadows, blur, and motion values live **only** in `packages/design-tokens`.
**Prohibited**: hardcoding any brand hex or pixel value in components. CI enforces this.

## P14 — Universal CalcInput

Every monetary field uses `CalcInput` (inline calculator with `+ − × ÷`).
No `eval`/`Function`; parser in `packages/money`; arithmetic in decimal/BigInt.

## P15 — Agentic UX Under Human Control

AI proposes, explains, and waits for approval. Every AI effect is reversible and auditable.
App must work completely without AI.

Autonomy levels (user-configurable per area):
- N0: suggestions only
- N1: auto-categorize + undo (default)
- N2: apply pre-approved low-risk rules
- Prohibited: moving real money, payments, accepting debt, selling assets (P7)

## P16 — Conventional Commits & Traceable History

Every change: `<type>(<scope>): <imperative description, English>`.
Agent commits and pushes after each green task, only to work branches.
`main` protected; integrated only via owner-approved PRs. No secrets committed.

---

## Invariants Reference

| ID | Name | Rule |
|---|---|---|
| I1 | Split total | `SUM(splits.amount) = parent.amount` |
| I2 | Transfer symmetry | `ABS(outflow) = ABS(inflow)` |
| I3 | Account balance | `balance = opening + SUM(posted)` |
| I4 | Category available | `available = prev_available + assigned + activity` |
| I5 | Ready to Assign | single canonical formula (defined in spec 05) |
| I6 | Reconciliation | `SUM(ledger) = bank_balance` (or explicit difference) |
| I7 | Currency isolation | Never add amounts of different currencies without explicit FX |

Full invariants: `docs/domain/invariants.md`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind, shadcn/ui, Framer Motion |
| Backend | Next.js server actions / route handlers |
| Database | PostgreSQL via Supabase |
| ORM | Drizzle ORM |
| Auth | Supabase Auth (ADR-E) |
| Validation | Zod |
| Testing | Vitest, Playwright |
| Jobs | Trigger.dev / Supabase scheduled functions |
| Storage | Supabase Storage |
| Observability | Sentry, OpenTelemetry |
| AI | Provider adapter (ADR-D) |

---

## Open ADRs (decide in I2)

| ADR | Decision needed |
|---|---|
| ADR-A | Mobile: PWA-first vs native |
| ADR-B | Banking sync provider (Plaid unavailable in Bolivia) |
| ADR-C | Default base currency: BOB |
| ADR-D | AI provider adapter + prompt privacy policy |
| ADR-E | Auth: Supabase Auth vs Auth.js |

---

*Approved by: [Owner — pending I0 sign-off]*
