# TASKS

## 03.11 Tasks atómicas

- [ ] [T03.1] Migración `accounts` + constraints/trigger de moneda + FK de `categories.linked_account_id` + RLS. — `feat(db): add accounts table with constraints and rls`
- [ ] [T03.2] Regla pura `startingBalanceRule` y `deriveIsOnBudget` + tests. — `feat(accounts): add starting balance rules`
- [ ] [T03.3] Comando `createAccount` (saldo inicial, categoría de pago de tarjeta) + integración. — `feat(accounts): add create account command`
- [ ] [T03.4] Función SQL `account_balances` (tras migración de transacciones) + test I3. — `feat(db): add account balances function`
- [ ] [T03.5] Query `listAccounts/getAccount` con totales. — `feat(accounts): add accounts overview queries`
- [ ] [T03.6] Comandos `updateAccount`, `reorderAccounts`. — `feat(accounts): add update and reorder commands`
- [ ] [T03.7] `closeAccount` (con transferencia), `reopenAccount`, `discardAccount`. — `feat(accounts): add close reopen and discard commands`
- [ ] [T03.8] `updateTrackingBalance`. — `feat(accounts): add tracking balance update`
- [ ] [T03.9] UI barra lateral de cuentas. — `feat(ui): add accounts sidebar`
- [ ] [T03.10] UI asistente "Agregar cuenta" con vista previa. — `feat(ui): add account creation wizard`
- [ ] [T03.11] UI encabezado de cuenta y asistente de cierre. — `feat(ui): add account header and close flow`
- [ ] [T03.12] Tests E2E de cuentas y RLS. — `test(accounts): add accounts e2e and rls tests`
