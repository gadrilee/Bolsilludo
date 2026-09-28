# SPEC 08 — Reconciliation

## WHAT
- Proceso para igualar el balance real del banco con el balance de la app.
- Marca las transacciones como `RECONCILED`, bloqueándolas contra ediciones accidentales.
- Si hay desajuste inexplicable, permite crear una transacción de ajuste.

## WHY
- Es la fuente de la verdad para garantizar la precisión del sistema (Invariante I6).
- Evita la deriva financiera con el paso de los meses.

## HOW
- Tabla `reconciliations` y actualización masiva de status en `transactions`.
- Flujo guiado en UI que pide el saldo actual del banco.
