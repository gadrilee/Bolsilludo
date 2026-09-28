# SPEC 10 — Scheduled Transactions

## WHAT
- Transacciones recurrentes (mensuales, quincenales, anuales) o futuras de una sola vez.
- Se muestran en el registro pero en gris (pendientes futuras).
- Se asientan automáticamente (`posted`) el día programado.

## WHY
- Alivia la carga mental de transacciones predecibles.
- Informa al Budget Engine para sugerencias de "Underfunded".

## HOW
- Tabla `scheduled_transactions` con reglas RRULE (cron-like).
- Job de background (cron) diario para asentar las transacciones que vencen hoy.
