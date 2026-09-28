# PLAN — Credit Cards

## Fases
1. **Database**: Grupo de categorías reservado para pagos de tarjetas.
2. **Backend**: Intercepción de transacciones de tarjeta de crédito (motor de doble entrada para budget transfers).
3. **Frontend**: Vista de cuenta de tarjeta de crédito mostrando el saldo adeudado vs lo disponible para pagar.
4. **Validación**: Los pagos a la tarjeta validan contra el "Available" de su categoría de pago.
