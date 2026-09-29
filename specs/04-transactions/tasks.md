# TASKS

## 04.11 Tasks atómicas

- [ ] [T04.1] Extensión `pg_trgm` + migración `payees`. — `feat(db): add payees table with trigram index`
- [ ] [T04.2] Migración `transactions` + índices + triggers de moneda/estado. — `feat(db): add transactions table and indexes`
- [ ] [T04.3] Migración `transaction_splits` + trigger diferido I1. — `feat(db): add transaction splits with deferred sum check`
- [ ] [T04.4] Trigger diferido I2 (par de transferencia) + vista `v_txn_lines`. — `feat(db): add transfer pair check and transaction lines view`
- [ ] [T04.5] Funciones puras: `validateAmount`, `distribute`, `validateSplits`, `categoryRuleFor`, `nextStatus` + tests unit/property. — `feat(tx): add pure transaction domain functions`
- [ ] [T04.6] `normalizePayee` + búsqueda/sugerencia de categoría. — `feat(payees): add payee normalization and suggestions`
- [ ] [T04.7] Comando `createTransaction` (con payee y default_category). — `feat(tx): add create transaction command`
- [ ] [T04.8] Comandos `updateTransaction`, `setSplits`, bloqueo de conciliadas y `unlockReconciled`. — `feat(tx): add update split and reconciled lock commands`
- [ ] [T04.9] `transferMoney`, `updateTransfer`, `voidTransaction/restore` (par atómico). — `feat(tx): add transfer and void commands`
- [ ] [T04.10] Comandos masivos (`setCleared/Approved/Flag`, `bulkUpdate`, `duplicate`, `moveToAccount`). — `feat(tx): add bulk transaction commands`
- [ ] [T04.11] Query `getAccountRegister` (cursor, filtros) + `getTransaction`. — `feat(tx): add register and transaction queries`
- [ ] [T04.12] Comandos/UI de comercios (renombrar, fusionar, archivar). — `feat(payees): add payee management`
- [ ] [T04.13] UI registro virtualizado, filtros, selección múltiple y edición en línea. — `feat(ui): add transaction register`
- [ ] [T04.14] UI Sheet de captura rápida con `CalcInput` y efecto en vivo. — `feat(ui): add quick transaction sheet`
- [ ] [T04.15] UI dividir, transferir y detalle de transacción. — `feat(ui): add split transfer and detail views`
- [ ] [T04.16] Deshacer/rehacer (`UndoDescriptor`) para comandos de esta spec. — `feat(ux): add undo for transaction commands`
- [ ] [T04.17] Tests de integración (I1/I2/RLS/concurrencia) y E2E. — `test(tx): add ledger integration and e2e tests`
