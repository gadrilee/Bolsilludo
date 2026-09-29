# TASKS

## 02.11 Tasks atómicas

- [ ] [T02.1] Migración `budgets`, `budget_members` + RLS + índices. — `feat(db): add budgets and members tables with rls`
- [ ] [T02.2] Migración `category_groups`, `categories`, `category_months`, `budget_movements` (FK compuestas, índices únicos parciales). — `feat(db): add category structure and monthly assignment tables`
- [ ] [T02.3] Drizzle schema + tipos + `requireMember(ctx,budgetId,minRole)`. — `feat(budget): add drizzle schema and membership guard`
- [ ] [T02.4] Plantillas JSON + `applyTemplate` puro + tests. — `feat(budget): add budget templates and template application`
- [ ] [T02.5] Comando `createBudget` (transacción única, idempotente) + tests de integración. — `feat(budget): add create budget command`
- [ ] [T02.6] Comandos `updateBudget`, `archive/restore/delete`, `duplicateBudgetStructure`, `switchBudget`. — `feat(budget): add budget lifecycle commands`
- [ ] [T02.7] Comandos de grupos y categorías (crear, renombrar, meta, ocultar). — `feat(category): add category and group commands`
- [ ] [T02.8] `reorderGroups/Categories` con reindexado denso + property test. — `feat(category): add dense reorder commands`
- [ ] [T02.9] `archiveCategory` + `budget_movements` (mover disponible a categoría o a Por asignar). — `feat(category): add archive with available money move`
- [ ] [T02.10] `previewMerge` y `mergeCategories`. — `feat(category): add category merge with impact preview`
- [ ] [T02.11] Query `getCategoryTree` y `listBudgets`. — `feat(budget): add category tree and budget list queries`
- [ ] [T02.12] UI: selector de presupuesto y `/b/new`. — `feat(ui): add budget switcher and creation screen`
- [ ] [T02.13] UI: editor de estructura (drag + teclado, ocultas, archivar, fusionar). — `feat(ui): add category structure editor`
- [ ] [T02.14] `getBudgetOverview` + registro de widgets + fuentes de atención (stubs por spec). — `feat(ux): add budget overview query and attention items`
- [ ] [T02.15] UI Inicio action-first (tarjetas, atención, estado vacío, modo simple). — `feat(ux): add action-first home dashboard`
- [ ] [T02.16] Ajustes generales y zona de peligro. — `feat(ui): add budget settings screen`
- [ ] [T02.17] Tests RLS + E2E (crear, reordenar, archivar, fusionar). — `test(budget): add rls and structure e2e tests`
