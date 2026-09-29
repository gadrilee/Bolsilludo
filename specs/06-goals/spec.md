# SPEC 06 — GOALS (METAS / TARGETS)

**Dependencias:** 02, 05. **Hito:** M2–M3. **Prefijos:** `FR-GOL`, `BR-GOL`, `AC-GOL`.
La spec 06 original solo definía tres tipos de meta; se **expande** a: cadencia, comportamiento, cálculo por periodo, cálculo de restante, semántica de arrastre, *snooze*, repetición, integración con Underfunded, progreso y casos borde.

## 06.1 Cómo funciona YNAB (🟦)

- Una meta (*target*) por categoría, con **cadencias** semanal, mensual, anual y personalizada, y **comportamientos** *Set aside*, *Fill/Refill up to* y *Have a balance of* (este solo en personalizadas).
- Las metas alimentan **Underfunded** y las barras de progreso, que muestran secciones según cadencia y arrastre.
- Una meta puede **posponerse** (*snooze*) sin borrarla: mientras tanto queda excluida de Underfunded.
- Los sobrantes del mes actual no cuentan para un *Refill up to* de un mes futuro hasta que empieza el mes nuevo.

## 06.2 Qué hará Bolsilludo

| Capacidad | Tipo |
|---|---|
| Modelo **cadencia + comportamiento + fecha/repetición** (no tres "tipos" fijos) | 🟦 paridad |
| Cadencias `WEEKLY, MONTHLY, YEARLY, CUSTOM`; comportamientos `SET_ASIDE, REFILL_UP_TO, HAVE_A_BALANCE` | 🟦 paridad |
| `GoalResultDTO` calculado por el dominio; **prohibido** calcular en JSX | 🟩 mejora |
| Barra de progreso con 4 componentes (arrastre, asignado del periodo, necesario, sobregastado) | 🟦 + 🟩 |
| Metas inteligentes (prioridad, dependencias, hitos, simulación *what-if*, fecha estimada, salud) | 🟩 **después del core** (Parte C) |
| 🟨 Una meta activa por categoría (como YNAB) | Decisión |
| 🟨 `BIWEEKLY` **no** es cadencia de meta (YNAB no la ofrece); sí existe en Programadas (Spec 10) | Decisión |

## 06.3 Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-GOL-001 | `EDITOR+` crea/edita/elimina (archiva) una meta en una categoría `standard`. |
| FR-GOL-002 | El sistema calcula por mes: requerido este mes, restante, progreso, estado y días restantes. |
| FR-GOL-003 | `EDITOR+` pospone (*snooze*) una meta para un mes sin borrarla. |
| FR-GOL-004 | Las metas alimentan Underfunded/Auto-Assign (05E) y la lista de atención. |
| FR-GOL-005 | El onboarding puede crear metas mensuales a partir de los "compromisos" (Spec 01). |

## 06.4 Reglas de negocio

| ID | Regla |
|---|---|
| BR-GOL-001 | Se separan **cadencia** + **comportamiento** + **fecha/repetición**. `HAVE_A_BALANCE` solo con cadencia `CUSTOM` y **no repetible**. |
| BR-GOL-002 | Categorías de sistema (`inflow_rta`, `credit_card_payment`) no admiten metas ⇒ `GOAL_UNSUPPORTED_CATEGORY`. |
| BR-GOL-010 | **Mensual · Set aside** (`300/mes`): cada periodo vuelve a pedir el monto; los sobrantes permanecen en la categoría y **no** se reinterpretan como asignación nueva. |
| BR-GOL-011 | **Mensual · Refill up to** (`meta 300`, `disponible final del mes anterior 130`): el requisito restaura hasta el nivel meta. En un mes futuro se considera que aún puede haber gasto en el mes actual: los fondos sobrantes del mes actual **no** cuentan para el *Refill* futuro hasta que comience el mes nuevo. |
| BR-GOL-030 | **Semanal:** no se asumen cuatro semanas. Si el día elegido aparece **5 veces** en el mes y `meta semanal = 100` ⇒ requisito del mes `500`. |
| BR-GOL-040 | **Anual** (`1200 para diciembre`): con 6 meses restantes el ritmo es `200/mes`; el cálculo real considera asignado del periodo, progreso del periodo, arrastre elegible y disponible actual. |
| BR-GOL-050 | **Personalizadas:** `300 cada 6 meses` · `1000 para una fecha` · `10000 tener un saldo para una fecha` (*Have a balance*). |
| BR-GOL-060 | **Snooze:** se guarda `snoozed_month`; la meta **no se borra**; mientras está pospuesta queda **excluida de Underfunded** (estado `SNOOZED`). |
| BR-GOL-070 | La UI **no** calcula: recibe `GoalResultDTO` (abajo) y solo pinta. |

```ts
type GoalResultDTO = {
  targetAmount: Money; assignedInPeriod: Money; available: Money;
  requiredThisMonth: Money; remaining: Money; progressRatio: number;
  status: 'FUNDED'|'UNDERFUNDED'|'OVERFUNDED'|'SNOOZED'|'COMPLETED'|'NO_TARGET';
  dueDate: string|null; daysRemaining: number|null;
  progressParts: { rollover: Money; currentAssigned: Money; needed: Money; overspent: Money };  // barra de 4 componentes
  explanation: { label: string; amount: Money }[];                                               // "¿Por qué?"
};
```

## 06.5 Modelo de datos

```sql
create table goals (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  category_id uuid not null,
  cadence text not null check (cadence in ('WEEKLY','MONTHLY','YEARLY','CUSTOM')),
  behavior text not null check (behavior in ('SET_ASIDE','REFILL_UP_TO','HAVE_A_BALANCE')),
  amount_minor bigint not null check (amount_minor > 0),
  start_date date, due_date date,
  repeat_enabled boolean not null default false,
  repeat_interval int check (repeat_interval > 0), repeat_unit text check (repeat_unit in ('WEEK','MONTH','YEAR')),
  week_start_day smallint check (week_start_day between 0 and 6),
  snoozed_month date check (snoozed_month is null or extract(day from snoozed_month) = 1),
  archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (id, budget_id),
  foreign key (category_id, budget_id) references categories (id, budget_id),
  check (behavior <> 'HAVE_A_BALANCE' or (cadence = 'CUSTOM' and repeat_enabled = false))
);
create unique index goals_category_uq on goals (category_id) where archived_at is null;   -- 🟨 una meta activa por categoría
-- RLS: plantilla A8.3; escritura EDITOR (excepción documentada en A8.3).
```

## 06.6 Backend

| Comando | Entrada | Efecto | Errores |
|---|---|---|---|
| `createGoal` / `updateGoal` | campos de `goals` + `version` | valida BR-GOL-001/002 | `GOAL_INVALID`, `GOAL_UNSUPPORTED_CATEGORY`, `CONFLICT_VERSION` |
| `snoozeGoal` / `unsnoozeGoal` | `goalId, month` | fija/limpia `snoozed_month` | – |
| `archiveGoal` | `goalId` | `archived_at` | – |

- **Queries:** `getGoalProgress(budgetId, month)` → `GoalResultDTO[]`. Funciones puras en `budget-engine/goals.ts`: `calculateGoalRequirement`, `calculateWeeklyOccurrences`, `calculateYearlyPacing`. Auditoría: `goal.created|updated|snoozed|archived`.
- Los `FundingRequirement` de tipo `TARGET` salen de aquí (05E).

## 06.7 UI

Tarjeta de meta (ejemplo): `Fondo de emergencia · 7.500 / 10.000 · 75% · Necesitas 625 este mes · [Asignar] [Simular]`. Barra de 4 componentes (BR-GOL-070). Editor de meta en un Sheet: cadencia → comportamiento → monto → fecha/repetición, con **vista previa** del requisito mensual. Estados de pantalla A9.3.

## 06.8 Casos borde

Mes con 5 ocurrencias semanales (BR-GOL-030) · meta anual con menos de un mes restante · *Refill* con sobrante del mes actual (BR-GOL-011) · meta sobre categoría archivada (bloquear) · categoría ya con meta (`unique`) · meta pospuesta y luego reactivada.

## 06.9 Criterios de aceptación

```text
AC-GOL-01  Given meta Mensual Set aside 300
           Then requiredThisMonth = 300 cada mes y el sobrante no se cuenta como asignación nueva.

AC-GOL-02  Given meta semanal 100 y un mes donde el día elegido aparece 5 veces
           Then requiredThisMonth = 500.

AC-GOL-03  Given meta anual 1200 para diciembre con 6 meses restantes
           Then el ritmo requerido es 200/mes (ajustado por asignado del periodo y arrastre elegible).

AC-GOL-04  Given una meta en snooze
           Then queda fuera de Underfunded, aparece como SNOOZED y no se borra.

AC-GOL-05  Given HAVE_A_BALANCE con cadencia MENSUAL o repetible
           Then GOAL_INVALID.

AC-GOL-06  Given Refill up to 300 con disponible final anterior 130
           Then requiredThisMonth = 170.
```

## 06.10 Tests requeridos

Unit por combinación cadencia×comportamiento (tabla de casos) · property: `requerido ≥ 0` y `progressRatio ∈ [0,1+]` · integración: constraint `HAVE_A_BALANCE` · E2E: crear meta → ver Falta asignar → Auto-Assign.

## 06.12 No hacer

🟥 tratar el mes como 4 semanas · 🟥 borrar la meta al posponerla · 🟥 calcular progreso en JSX · 🟥 permitir `HAVE_A_BALANCE` repetible · 🟥 metas sobre categorías de sistema · 🟥 reinterpretar sobrantes como asignación nueva.

---
