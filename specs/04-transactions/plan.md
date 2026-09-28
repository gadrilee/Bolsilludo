# PLAN — Transactions

## Fases
1. **Database**: Tablas `transactions`, `transaction_splits` (Invariante I1), `payees`.
2. **Transfers**: Lógica `transfer_group_id` para doble entrada (Invariante I2).
3. **Frontend**: Transaction Register (Lista) y Drawer de nueva transacción con `CalcInput`.
4. **Validación**: `amount` debe ser BIGINT/INTEGER y validado estrictamente.
