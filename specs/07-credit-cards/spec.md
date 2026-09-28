# SPEC 07 — Credit Cards

## WHAT
- Cuentas de tipo `CREDIT_CARD` tienen comportamiento especial.
- El gasto en tarjetas mueve el dinero de la categoría original a la "Categoría de Pago de Tarjeta".
- Credit Overspending: Si no hay fondos, se genera deuda en lugar de saldo negativo en la categoría general.

## WHY
- Representa con precisión el gasto financiado.
- Evita la "fabricación de dinero" protegiendo el RTA.

## HOW
- El Budget Engine interceptará transacciones de cuentas `CREDIT_CARD`.
- Categorías automáticas en el grupo "Credit Card Payments".
