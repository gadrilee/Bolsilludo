# SPEC 13 — Multi-Currency

## WHAT
- Soporte para transacciones, cuentas y presupuestos en múltiples divisas.
- Conversión de monedas en tiempo real o estática para cálculos de "Ready to Assign".
- El usuario puede definir una "Base Currency" global.

## WHY
- Los usuarios, especialmente en LATAM, manejan sus finanzas en moneda local y dólares simultáneamente.
- Diferenciador clave respecto a soluciones como YNAB.

## HOW
- Atributo `currency` en `accounts` y `transactions`.
- Servicio externo (ej. ExchangeRate-API) para obtener tasas de conversión diarias o permitir al usuario ingresar una tasa manual para una transacción.
