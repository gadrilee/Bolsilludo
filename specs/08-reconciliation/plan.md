# PLAN — Reconciliation

## Fases
1. **Database**: Tabla `reconciliations` para el historial de conciliaciones.
2. **Backend**: Acción para conciliar transacciones `CLEARED` y calcular la diferencia. Acción para emitir un ajuste.
3. **Frontend**: Widget "Reconcile Account" en la vista de la cuenta.
4. **Validación**: Las transacciones reconciliadas no pueden ser eliminadas ni pueden cambiar su `amount`.
