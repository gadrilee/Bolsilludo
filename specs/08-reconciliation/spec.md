# SPEC 08 — RECONCILIATION (CONCILIACIÓN)

**Dependencias:** 03, 04. **Hito:** M3. **Prefijos:** `FR-REC`, `BR-REC`, `AC-REC`.
La spec 08 original bloqueaba transacciones conciliadas y permitía ajuste, pero no distinguía *cleared* de *reconciled* ni documentaba el flujo exacto.

## 08.1 Cómo funciona YNAB (🟦)

- Conciliar = comparar el **saldo confirmado (cleared)** del banco con el de la app y marcar como conciliadas (🔒) las transacciones confirmadas hasta ese saldo. Si hay diferencia, se investiga o se crea un **ajuste de saldo**.
- **No** se puede simplemente "desconciliar" una transacción: se corrigen los errores y se vuelve a conciliar.
- Editar una transacción conciliada exige confirmar una advertencia (04.1).

## 08.2 Qué hará Bolsilludo

| Capacidad | Tipo |
|---|---|
| Flujo guiado de conciliación con saldo del banco y diferencia en vivo | 🟦 paridad |
| Tabla `reconciliations`; transacciones enlazadas por `reconciliation_id` | 🟦 + 🟩 |
| Ajuste como transacción `kind='reconciliation_adjustment'`, **nunca** editando una compra antigua | 🟦 paridad |
| Protección de `RECONCILED` (ADR-G7): correcciones auditadas | 🟨 |
| **Asistente de conciliación:** posibles coincidencias con % (mismo monto, fecha cercana, comercio, id externo, pendiente→posted) | 🟩 mejora |

## 08.3 Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-REC-001 | `EDITOR+` inicia y completa una conciliación de una cuenta abierta. |
| FR-REC-002 | El sistema calcula el saldo confirmado de la app y la diferencia contra el del banco. |
| FR-REC-003 | Con diferencia `0` se completa; si no, se investiga o se crea un ajuste. |
| FR-REC-004 | El sistema sugiere coincidencias (asistente). |
| FR-REC-005 | La cuenta muestra "conciliado hasta {fecha} 🔒" y avisa si pasan > 14 días (Atención, 02.6.4). |

## 08.4 Reglas de negocio

| ID | Regla |
|---|---|
| BR-REC-001 | **`cleared` ≠ `reconciled`.** Conciliar compara `bank_cleared_balance` con `app_cleared_balance` (BR-ACC-021). |
| BR-REC-002 | Flujo: *abrir cuenta → Conciliar → ingresar saldo confirmado del banco → calcular saldo confirmado de la app → diferencia → revisar pendientes → si `diferencia = 0` completar; si no, investigar/ajustar*. |
| BR-REC-003 | Al completar, las transacciones `CLEARED` con `date ≤ statement_date` pasan a `RECONCILED` y reciben `reconciliation_id`. |
| BR-REC-010 | En `RECONCILED` están bloqueados `amount`, `date`, `account`, `splits` y anulación (= BR-TRX-060). |
| BR-REC-011 | **Nunca** se edita una compra antigua para cuadrar: se crea una transacción `reconciliation_adjustment` con memo *"Ajuste de conciliación"* enlazada a `reconciliation_id`. |
| BR-REC-012 | Intentar modificar monto/cuenta/fecha de una conciliada ⇒ diálogo *[Crear corrección] [Duplicar y reemplazar] [Desbloquear] [Cancelar]* (BR-TRX-062). |
| BR-REC-013 | Desbloquear (BR-TRX-061) deja `reconcile_dirty=true` hasta la siguiente conciliación. |
| BR-REC-020 | **Asistente:** puntúa candidatos por mismo monto, fecha igual/cercana, similitud de comercio, id externo y relación pendiente→posted. Ej.: *"Posible coincidencia 96% — Amazon −120 · 28 sep. [Emparejar] [Rechazar]"*. Umbrales como Spec 09 (BR-IMP-030..031). |

## 08.5 Modelo de datos

```sql
create table reconciliations (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  account_id uuid not null,
  statement_date date not null,
  bank_cleared_balance_minor bigint not null,
  app_cleared_balance_minor bigint not null,
  difference_minor bigint not null,
  status text not null check (status in ('OPEN','COMPLETED','CANCELLED')),
  completed_by uuid, completed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (account_id, budget_id) references accounts (id, budget_id)
);
create unique index reconciliations_open_uq on reconciliations (account_id) where status = 'OPEN';
-- accounts.reconcile_dirty boolean not null default false  (añadir; ver 04.4 BR-TRX-061)
-- RLS: plantilla A8.3.
```

## 08.6 Backend

| Comando | Entrada | Efecto | Errores |
|---|---|---|---|
| `startReconciliation` | `accountId, statementDate, bankClearedBalanceMinor` | crea fila `OPEN`, calcula saldo confirmado de la app | `RECONCILIATION_OPEN_EXISTS`, `ACCOUNT_CLOSED` |
| `completeReconciliation` | `reconciliationId, adjust?: boolean` | valida `diferencia = 0` o crea ajuste; marca transacciones `RECONCILED`; limpia `reconcile_dirty` | `RECONCILIATION_MISMATCH` |
| `suggestMatches` (query) | `accountId` | candidatos con score | – |

`assertReconciliationConsistency` (05H) verifica `Σ RECONCILED = último saldo conciliado`. Auditoría: `reconciliation.started|completed|adjusted`.

## 08.7 UI

Asistente en un panel (Nivel 3): 1 saldo del banco → 2 diferencia en vivo → 3 lista de pendientes (con sugerencias %) → 4 completar / crear ajuste. Tablas permitidas aquí (A9.8). Estado 🔒 en el registro y aviso "conciliado hasta …".

## 08.8 Casos borde

Diferencia negativa/positiva · transferencia con un lado conciliado (04.8) · cuenta de tarjeta (saldo negativo) · conciliar con fecha anterior a la última conciliación · edición de conciliada durante una conciliación abierta.

## 08.9 Criterios de aceptación

```text
AC-REC-01  Given cleared app = 1000 y cleared banco = 1000
           Then diferencia 0 y la conciliación se completa.

AC-REC-02  Given diferencia ≠ 0
           When elige ajustar
           Then se crea 1 transacción reconciliation_adjustment y no se edita ninguna compra previa.

AC-REC-03  Given transacción RECONCILED
           When intenta editar el monto
           Then TRANSACTION_RECONCILED_LOCKED con las 4 opciones.

AC-REC-04  Given candidato con mismo monto, fecha cercana y comercio similar
           Then el asistente muestra el % y permite Emparejar/Rechazar.
```

## 08.10 Tests requeridos

Unit del cálculo de diferencia y de las transiciones · property: tras conciliar, `Σ RECONCILED` cuadra · integración: edición bloqueada, `reconcile_dirty` · E2E: GS-06, GS-13.

## 08.12 No hacer

🟥 confundir `cleared` con `reconciled` · 🟥 editar una compra antigua para cuadrar · 🟥 "desconciliar" en silencio · 🟥 conciliar sin comparar contra el saldo confirmado del banco · 🟥 permitir editar monto/fecha/cuenta de conciliadas sin el diálogo auditado.


---
