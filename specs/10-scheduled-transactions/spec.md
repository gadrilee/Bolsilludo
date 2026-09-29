# SPEC 10 — SCHEDULED TRANSACTIONS (PROGRAMADAS)

**Dependencias:** 03, 04, 05. **Hito:** M3–M4. **Prefijos:** `FR-SCH`, `BR-SCH`, `AC-SCH`.
La spec 10 original usaba RRULE/cron y un job diario. Se **amplía** con: zona horaria, clave de ocurrencia, idempotencia, modo aprobación vs auto-registro, reintentos, prevención de duplicados y semántica de planificación futura.

## 10.1 Cómo funciona YNAB (🟦)

- Las **transacciones programadas** son plantillas que generan movimientos futuros (facturas, sueldos, suscripciones) y alimentan el planificador de "próximos pagos" y *Underfunded*.
- Permiten frecuencias propias (a diferencia de las metas, que no ofrecen quincenal).
- Un reembolso esperado puede representarse como un **ingreso programado**.

## 10.2 Qué hará Bolsilludo

| Capacidad | Tipo |
|---|---|
| Plantilla programada **separada** de la transacción real ya registrada | 🟦 paridad |
| Frecuencias `MONTHLY, WEEKLY, BIWEEKLY, YEARLY, CUSTOM` (+ `ONCE` 🟨) | 🟦 + 🟨 |
| Motor de ocurrencias `calculateDueOccurrences(schedule, now, timezone)` (no un `cron if hoy == día`) | 🟩 mejora |
| Idempotencia por ocurrencia: un job ejecutado dos veces no duplica | 🟩 mejora |
| Modo **aprobación** (aparece en "Próximos", el usuario registra) y **auto-registro** (`auto_post`) | 🟩 mejora |
| Alimenta *Underfunded* (`SCHEDULED_TRANSACTION`) y "Próximos 30 días" del Inicio | 🟦 + 🟩 |
| Ingreso programado como **reembolso esperado** (BR-TRX-074) | 🟦 |

## 10.3 Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-SCH-001 | `EDITOR+` crea, edita, pausa y elimina (archiva) una programada. |
| FR-SCH-002 | El sistema calcula las ocurrencias vencidas y las registra según el modo. |
| FR-SCH-003 | El sistema muestra "Próximos" (30 días) y marca visualmente lo futuro en el registro. |
| FR-SCH-004 | Un job repetido no crea transacciones duplicadas. |
| FR-SCH-005 | Las programadas alimentan Underfunded y la lista de atención (pagos en 7 días sin fondos). |

## 10.4 Reglas de negocio

| ID | Regla |
|---|---|
| BR-SCH-001 | Las fechas se evalúan en `budget.timezone`, **no** en la zona del servidor (A3). |
| BR-SCH-010 | **Ancla:** las series se calculan desde la fecha de inicio (`start_at`) — nunca sumando al resultado anterior — para evitar la deriva `31 ene → 28 feb → 28 mar` (bug #11). Si el día no existe en el mes, se usa el último día del mes. |
| BR-SCH-011 | `calculateDueOccurrences(schedule, now, timezone)` devuelve **todas** las ocurrencias vencidas desde `last_occurrence_at` (incluye ocurrencias atrasadas si el job estuvo caído). |
| BR-SCH-020 | **Idempotencia:** `UNIQUE(scheduled_id, occurrence_date)` (10.5); `occurrence_key = scheduled_id + occurrence_date`. |
| BR-SCH-030 | **`auto_post = false` (aprobación):** la ocurrencia aparece en "Próximos" y el usuario la registra. **`auto_post = true`:** el job crea la transacción con `source='scheduled'`, `is_approved=false` (BR-TRX-013) y `status=PENDING`. |
| BR-SCH-040 | **Planificación futura:** las ocurrencias futuras no cambian saldos de hoy; en el registro se ven como filas futuras atenuadas (BR-TRX-023). Cuentan en Underfunded y "Próximos 30 días". |
| BR-SCH-050 | Job con `retry_count`, `next_retry_at`, `last_error`, `status` (A13.2). Un fallo no revierte ocurrencias ya registradas. |
| BR-SCH-060 | Cerrar una cuenta con programadas activas está bloqueado (BR-ACC-030). |

## 10.5 Modelo de datos

```sql
create table scheduled_transactions (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  account_id uuid not null, payee_id uuid, category_id uuid,
  amount_minor bigint not null check (amount_minor <> 0), currency char(3) not null,
  memo text not null default '' check (char_length(memo) <= 200),
  frequency_type text not null check (frequency_type in ('ONCE','WEEKLY','BIWEEKLY','MONTHLY','YEARLY','CUSTOM')),
  frequency_rule jsonb not null default '{}',                    -- {every, unit, byMonthDay, byWeekday, ...}
  start_at date not null, end_at date,
  next_occurrence_at date, last_occurrence_at date,
  auto_post boolean not null default false,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED','ENDED')),
  reimbursement_group_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (id, budget_id),
  foreign key (account_id, budget_id) references accounts (id, budget_id)
);
create index idx_scheduled_next on scheduled_transactions (next_occurrence_at) where status = 'ACTIVE';
-- transactions.scheduled_id + occurrence_date (04.5):
create unique index tx_scheduled_occurrence_uq on transactions (scheduled_id, occurrence_date)
  where scheduled_id is not null and status <> 'VOIDED';
-- RLS: plantilla A8.3.
```

## 10.6 Backend

| Comando | Efecto | Errores |
|---|---|---|
| `createScheduled` / `updateScheduled` / `pauseScheduled` / `archiveScheduled` | valida `SCHEDULE_INVALID_RULE`; recalcula `next_occurrence_at` | `SCHEDULE_INVALID_RULE`, `CONFLICT_VERSION` |
| `postOccurrence` | el usuario registra una ocurrencia (modo aprobación) | – |
| `processDueScheduled` (job) | por cada programada activa: `calculateDueOccurrences` → crea las que falten (idempotente) | – |

- **Query:** `getUpcoming(budgetId, days=30)` → `{ total: Money, count, items[] }` (alimenta el Inicio). Funciones puras: `calculateDueOccurrences`, `nextOccurrence`.
- **Auditoría:** `scheduled.created|updated|posted|auto_posted`. Sin llamadas de red dentro de la transacción (A13.1).

## 10.7 UI

Lista "Próximos" (ej.: `Alquiler · 1.000 · vence 1 oct.` / `Spotify · 59,90 · vence 4 oct.` · `[Crear]`). Editor: frecuencia → regla → fecha inicio/fin → modo (aprobación / auto-registro) con vista previa de las próximas 5 ocurrencias. Filas futuras diferenciadas en el registro (A9.3).

## 10.8 Casos borde

Día 31 en meses cortos · cambio de horario/zona · job caído varios días (ocurrencias atrasadas) · edición de la plantilla después de generar ocurrencias (no reescribe las ya registradas) · cierre de cuenta con programadas · reembolso esperado ligado a un gasto.

## 10.9 Criterios de aceptación

```text
AC-SCH-01  Given una programada mensual con ancla el 31
           Then las ocurrencias son 31 ene, 28/29 feb, 31 mar (sin deriva).

AC-SCH-02  Given el job procesado dos veces el mismo día
           Then existe exactamente 1 transacción (GS-10).

AC-SCH-03  Given auto_post=true
           Then se crea la transacción con source='scheduled' e is_approved=false.

AC-SCH-04  Given auto_post=false
           Then la ocurrencia aparece en "Próximos" y no crea transacción hasta registrarla.

AC-SCH-05  Given un job caído 3 días
           Then al volver crea las 3 ocurrencias faltantes, una vez cada una.
```

## 10.10 Tests requeridos

Unit: `calculateDueOccurrences` por frecuencia (tabla, con reloj inyectado) · property: sin duplicados por `(scheduled_id, occurrence_date)` · integración: doble ejecución del job · E2E: GS-10.

## 10.12 No hacer

🟥 `cron if hoy == día` · 🟥 sumar al resultado anterior (deriva) · 🟥 evaluar fechas en la zona del servidor · 🟥 crear transacciones sin `UNIQUE(scheduled_id, occurrence_date)` · 🟥 hacer llamadas de red dentro de la transacción del job.

---
