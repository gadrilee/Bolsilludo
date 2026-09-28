# Git Conventions — Bolsilludo

> Operative copy of Section 159 of `PlanInit.md`.
> In case of conflict, the plan document takes precedence.

---

## Format

```text
<type>(<scope>): <imperative description, English>
```

Rules:
- Description in **English**, **imperative** mood ("add", not "added")
- Lowercase initial letter, **no trailing period**
- Maximum **72 characters** total
- Brief: what changes, not how

---

## Types

| Type | Use |
|---|---|
| `feat` | New functionality |
| `fix` | Bug fix |
| `docs` | Documentation, specs, ADRs, glossary |
| `test` | Add or correct tests |
| `refactor` | Internal change without behavior change |
| `perf` | Performance improvement |
| `style` | Formatting, no logic change |
| `build` | Build system, monorepo, packaging |
| `ci` | Pipelines and workflows |
| `chore` | Maintenance, dependencies, config |
| `revert` | Revert a previous commit |

---

## Scopes

One scope per commit. Aligned with modules (section 93) and specs (section 157.3).

```text
Domain:    auth · identity · budget · category · accounts · tx · payees
           engine · goals · cards · recon · imports · sched · rules
           reports · collab · fx · shared · assets · debt
           ai · ocr · copilot · automation · alerts · offline
           gamification · analytics · search · notifications · audit

Platform:  db · api · money · ui · tokens · ux · brand · i18n

Repo:      specs · adr · docs · ci · deps · config · repo · seed · ws · wiki
```

**If a change touches two domain scopes → split into two commits.**

---

## Examples

```bash
feat(money): add recursive descent parser for CalcInput
feat(tx): add split transaction validation
fix(engine): correct rollover for negative category balance
test(engine): add property test for ready-to-assign invariant
refactor(cards): extract payment availability to pure function
feat(db): add category_months migration
docs(specs): add spec and plan for 03-accounts
chore(ci): add contrast check for design tokens
feat(ui): add GlassCard with opaque fallback
```

---

## Atomic commits: when to split

One commit = **one logical change** that compiles and passes its tests.

Split when:
- Mixing different **types** (e.g. `feat` + `refactor`)
- Touching different **scopes**
- More than ~10 files or ~400 changed lines
- Includes migration + logic + UI (always separate, in that order)

Recommended order within a user story:

```text
1. feat(db):     migration and schema
2. feat(engine): pure domain function
3. test(engine): unit and property tests
4. feat(api):    command and query handlers
5. feat(ui):     screen or component
6. docs(specs):  mark tasks done, update traceability
```

---

## Body and footer (optional)

Use only when they add value:

```text
feat(tx): add split transaction validation

Reject saves when sum(splits) != parent amount (I1).

Refs: T014, FR-TRX-003
```

- Body: the **why**, in English, lines ≤ 100 characters
- `Refs:` with task IDs and requirement IDs (traceability, section 88)
- Breaking change: `!` after scope + `BREAKING CHANGE:` footer

---

## Branches

```text
main   always deployable; protected
dev    working branch; iteration integration
```

Flow:
1. Agent pushes automatically to `dev` after each green task
2. At end of iteration: verify CI green on `dev`, create PR → `main`, owner approves, rebase + merge, tag milestone

---

## Prohibited

- `git push --force` on shared branches
- `--no-verify`
- Committing: `.env`, credentials, tokens, real bank payloads, real user financial data, receipt images of real users
- Editing already-applied migrations (create a new one instead)
