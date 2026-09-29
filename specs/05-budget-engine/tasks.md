# TASKS

## 05.11 Tasks atómicas

- [ ] [T05.1] Migración `budget_assignment_events` + RLS + índices. — `feat(db): add budget assignment events`
- [ ] [T05.2] Extender `category-state.ts` con enum de salud y `categoryHealth`. — `feat(engine): add category health states`
- [ ] [T05.3] `rollover.ts` (BR-ENG-010) + tests. — `feat(engine): add rollover rules`
- [ ] [T05.4] `overspending.ts` (efectivo vs tarjeta) + tests GS-05/GS-08. — `feat(engine): add overspending rules`
- [ ] [T05.5] `rta.ts` A5.4 + `invariants.ts` A5.5 + property test. — `feat(engine): add canonical rta and invariants`
- [ ] [T05.6] `snapshot.ts` + `getBudgetSnapshot`. — `feat(engine): add budget snapshot facade`
- [ ] [T05.7] Comandos `assignMoney/unassignMoney/moveMoney/resetAvailable` (atómicos, idempotentes). — `feat(budget): add assignment commands`
- [ ] [T05.8] `rankFundingRequirements` + `auto-assign.ts` (6 estrategias). — `feat(engine): add auto-assign strategies`
- [ ] [T05.9] `previewAutoAssign/applyAutoAssign` con `previewHash`. — `feat(budget): add auto-assign preview and apply`
- [ ] [T05.10] Warnings (`FUTURE_NEGATIVE_ASSIGNED`, `RTA_NEGATIVE`). — `feat(engine): add budget warnings`
- [ ] [T05.11] UI grilla de presupuesto + panel Auto-Assign + explicadores. — `feat(ui): add budget grid and auto-assign panel`
- [ ] [T05.12] Tests integración + E2E dorados. — `test(engine): add engine integration and golden e2e`
