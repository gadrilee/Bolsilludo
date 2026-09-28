# Bolsilludo

> **Your personal finance OS** — zero-based budgeting, multi-currency, AI copilot, and wealth management.

[![License: Private](https://img.shields.io/badge/license-private-red)](.)
[![Constitution](https://img.shields.io/badge/constitution-v1.0-blue)](.specify/memory/constitution.md)
[![Iteration](https://img.shields.io/badge/iteration-I0--Kickoff-orange)](specs/00-roadmap/)

---

## What is Bolsilludo?

Bolsilludo is a **personal financial operating system** that combines:

- **50% YNAB-style** zero-based budgeting (envelopes, rollover, credit cards, reconciliation, imports, reports)
- **50% Independent differentiation** (multi-currency, AI categorization, receipt OCR, finance copilot, shared expenses, debt planner, gamification, offline-first)

The UI prioritizes **actions over tables**:
> "You have $720 to assign." · "Your card needs $140 covered." · "Your emergency goal is 27% complete."

---

## Quick start

```bash
# Prerequisites: Node 20+, pnpm 9+
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

---

## Repository structure

```text
bolsilludo/
├── .specify/memory/constitution.md   ← Supreme authority document
├── specs/                            ← All feature specifications
│   ├── 00-roadmap/                   ← Master roadmap
│   ├── 00b-design-system/            ← Brand, tokens, 3 styles, CalcInput
│   ├── 01-identity/ … 25-platform-ux/
├── apps/
│   ├── web/                          ← Next.js PWA
│   ├── mobile/                       ← Future native (ADR-A)
│   └── admin/
├── packages/
│   ├── money/                        ← Integer arithmetic + CalcInput parser
│   ├── budget-engine/                ← Pure deterministic budget functions
│   ├── design-tokens/                ← Single source of brand tokens
│   ├── ui/                           ← Shared component library
│   └── …
├── docs/
│   ├── ADR/                          ← Architecture Decision Records
│   └── domain/                       ← Glossary, invariants, financial model
└── tests/
```

---

## Core principles (Constitution)

| # | Principle | TL;DR |
|---|---|---|
| P1 | Financial Correctness First | Exactness over convenience |
| P2 | Integer Money | No float; `amount_minor INTEGER` |
| P3 | Immutable History | No physical deletes; void with audit |
| P4 | Double-Entry | Transfers maintain balance |
| P5 | Deterministic Engine | Same input → same output, always |
| P6 | Explainability | AI explains what, why, how, impact |
| P7 | Human Approval | AI never moves money without approval |
| P8 | Privacy by Design | Minimal data; user controls |
| P9 | Offline Friendly | Capture without internet |
| P10 | Accessibility | WCAG 2.2 AA, contrast CI |
| P11 | Mobile First | Quick entry < 10 seconds |
| P12 | No Spreadsheet | Actions first, tables second |
| P13 | Brand Tokens SSoT | No hardcoded hex in components |
| P14 | Universal CalcInput | Every amount field has a calculator |
| P15 | Agentic UX | AI proposes; human decides; reversible |
| P16 | Conventional Commits | Atomic, traceable, no secrets |

Full constitution: [`.specify/memory/constitution.md`](.specify/memory/constitution.md)

---

## Brand

| Token | Hex | Role |
|---|---|---|
| `--bol-navy-900` | `#0B2046` | Deep background (dark theme) |
| `--bol-emerald-500` | `#16B78C` | Primary: actions, positive, focus |
| `--bol-green-700` | `#0B7A5A` | Primary dark: hover, links |
| `--bol-gold-400` | `#F4C13A` | Accent: goals, currency, achievements |

Theme: **dark by default**, full light theme also mandatory.

---

## Git conventions

Format: `<type>(<scope>): <imperative description, English>`

```bash
feat(tx): add split transaction validation
fix(engine): correct rollover for negative category balance
docs(specs): add constitution v1.0 with principles P1-P16
```

Full conventions: [`docs/git-conventions.md`](docs/git-conventions.md)
Full guide: [Section 159 of PlanInit.md](PlanInit.md)

---

## Roadmap

See [`specs/00-roadmap/`](specs/00-roadmap/) for the full spec-of-specs.

| Milestone | Status |
|---|---|
| M0 — Architecture + Constitution | 🟡 In Progress (I0) |
| M1 — Ledger MVP | ⬜ Pending |
| M2 — Budget Engine | ⬜ Pending |
| M3 — Goals + Cards + Scheduled | ⬜ Pending |
| M4 — Reconciliation + Imports | ⬜ Pending |
| M5 — Reports + Collaboration | ⬜ Pending |
| M6–M15 — Differentiation | ⬜ Pending |

---

*Bolsilludo — "Finance OS" is the internal category. The visible name is **Bolsilludo**.*
