# SPEC 03 — Accounts

## WHAT
- Cuentas financieras asociadas al presupuesto (Checking, Savings, Cash, Credit Card, etc.).
- Control de saldos (opening, current, cleared, reconciled).
- Las cuentas alimentan el dinero "Ready to Assign".

## WHY
- Sin cuentas no hay dinero en el sistema.
- Permiten reflejar la realidad del banco en la aplicación.

## HOW
- Tabla `accounts` con tipos enumerados.
- UI para listar cuentas y sus balances actualizados.
