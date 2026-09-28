# SPEC 04 — Transactions

## WHAT
- El motor de flujo de dinero (Ingresos, Gastos, Transferencias).
- Split Transactions (dividir un monto en varias categorías).
- Soporte a payees, memos, estados (pending, cleared, reconciled).

## WHY
- Las transacciones son los eventos que mutan la realidad de los presupuestos y saldos.
- El ingreso alimenta el RTA; el gasto resta del Category Available.

## HOW
- Tablas `transactions`, `transaction_splits`, `payees`.
- Drawer/Modal robusto para captura ágil en < 10 segundos.
