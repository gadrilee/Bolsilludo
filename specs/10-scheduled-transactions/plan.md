# PLAN — Scheduled Transactions

## Fases
1. **Database**: Tabla `scheduled_transactions` y lógica de frecuencia.
2. **Backend**: CRON job (o Trigger.dev/Supabase PG_CRON) para inyectar transacciones.
3. **Frontend**: Vista combinada de transacciones futuras (grises) y pasadas.
4. **Validación**: Evitar "doble inserción" mediante logs de ejecución o `last_posted_at`.
