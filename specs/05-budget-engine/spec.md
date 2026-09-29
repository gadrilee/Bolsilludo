# SPEC 05 — BUDGET ENGINE (MOTOR DE PRESUPUESTO, ROLLOVER, SOBREGASTO, AUTO-ASSIGN)

**Dependencias:** 02, 03, 04. **Hito:** M2. **Prefijos:** `FR-ENG`, `BR-ENG`, `AC-ENG`.
**Compatibilidad:** `packages/budget-engine` (`calculateMonthState`, `calculateCategoryState`, `calculateRTA`, T001–T006 ✅) **no se reescribe: se extiende** y sus tests deben seguir pasando.
**La spec 05 original se reemplaza y se divide en sub-specs** (cada una con su `spec.md/plan.md/tasks.md`):

| Sub-spec | Contenido |
|---|---|
| **05A** | Estado de categoría (`CategoryState`, salud) |
| **05B** | Por asignar (RTA) |
| **05C** | Arrastre (rollover) |
| **05D** | Sobregasto (efectivo vs tarjeta) |
| **05E** | Auto-Assign + motor de "Falta asignar" |
| **05F** | Integración con metas (Spec 06) |
| **05G** | Integración con tarjetas (Spec 07) |
| **05H** | Invariantes y verificación |

## 05.1 Cómo funciona YNAB (🟦)

- **Por asignar** es el dinero de cuentas del presupuesto que aún no tiene trabajo. Asignar sube *Assigned*; el *Available* positivo **permanece** al cambiar de mes.
- El **sobregasto en efectivo** (rojo) reduce Por asignar del mes siguiente si no se cubre. El **sobregasto con tarjeta** (amarillo) es otra cosa: es deuda nueva, no falta de efectivo.
- **Auto-Assign** siempre funciona con *vista previa → confirmar*. Estrategias documentadas: Underfunded, Assigned Last Month, Spent Last Month, Average Assigned, Average Spent, Reduce Overfunding.
- **Underfunded** considera transacciones programadas, metas, categorías de pago de tarjeta y sobregasto.
- Se recomienda **evitar Assigned negativo en meses futuros**.
- Un ingreso puede ir **directo a una categoría** (p. ej. reembolso): sube su Disponible sin tocar Por asignar.

## 05.2 Qué hará Bolsilludo

| Capacidad | Tipo |
|---|---|
| Fórmulas canónicas A5 (categoría, pago de tarjeta, RTA) en funciones puras; RTA **no** es `efectivo − asignado` | 🟦 + 🟨 |
| Historial de asignaciones como **eventos** trazables (`budget_assignment_events`); `assigned_minor` es su agregado | 🟩 mejora |
| Mover dinero entre categorías (par de eventos ligado por `movement_id`), Reset Available, Desasignar | 🟦 paridad |
| Auto-Assign con estrategias + **vista previa firmada** (`previewHash`) | 🟦 + 🟩 |
| Motor de requisitos de financiación (`FundingRequirement[]`) con ranking único | 🟦 + 🟨 |
| Estados de salud de categoría como **enum de dominio** (la UI solo los traduce a color/icono/texto) | 🟩 mejora |
| Fachada única `getBudgetSnapshot(budgetId, month)` usada por Inicio, Presupuesto y Tarjetas | 🟩 mejora |
| Explicadores "¿Por qué?" generados por el dominio (A9.8) | 🟩 mejora |
| Invariantes en ejecución: en test *fail-fast*, en producción log crítico + snapshot | 🟩 mejora |
| 🟨 Los meses **no** tienen tabla propia (`budget_months`): se materializan de forma perezosa vía `category_months` (ADR-M3) | Decisión |

## 05.3 Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-ENG-001 | El sistema calcula, para cualquier `(presupuesto, mes)`, el estado de cada categoría, Por asignar, tarjetas, metas y advertencias con **un único** motor. |
| FR-ENG-002 | `EDITOR+` asigna, desasigna y mueve dinero entre categorías o de/hacia Por asignar. |
| FR-ENG-003 | `EDITOR+` restablece el Disponible de una categoría a Por asignar (*Reset Available*), con eventos explícitos. |
| FR-ENG-004 | El usuario planifica el mes actual y meses futuros; el sistema distingue *financiado ahora / planificado a futuro / sobre-asignado a futuro*. |
| FR-ENG-005 | Auto-Assign propone cambios con una estrategia elegida; nada se guarda hasta confirmar. |
| FR-ENG-006 | El sistema muestra el motivo ("¿Por qué?") de cada cifra compleja. |
| FR-ENG-007 | El sistema emite advertencias (`warnings[]`) sin bloquear (Asignado negativo futuro, RTA negativo, etc.). |

## 05.4 Reglas de negocio

### Arrastre (05C)

| ID | Regla |
|---|---|
| BR-ENG-010 | `apertura(mes N) = max(0, cierre(mes N−1))` (A5.1 `start`). **Nunca** sumar `available_anterior + rollover` como dos montos independientes: son el mismo dinero. |
| BR-ENG-011 | El arrastre positivo **no** crea un ingreso en ninguna cuenta. Ej.: Sept. `Asignado 500, Actividad −400, Disponible 100` ⇒ Oct. `apertura = 100`, sin `inflow +100`. |
| BR-ENG-012 | Un Disponible **negativo** no se arrastra como saldo gastable: ver BR-ENG-030..032. |

### Meses futuros (05B)

| ID | Regla |
|---|---|
| BR-ENG-020 | Una asignación a un mes futuro **no es dinero recibido** ni crea Por asignar. `rta_disponible_hoy = RTA(mes actual) − Σ asignado en meses futuros` (A5.4). |
| BR-ENG-021 | Si el Asignado de un mes futuro es **negativo**, el snapshot marca `future_assigned_negative = true` y emite la advertencia `FUTURE_NEGATIVE_ASSIGNED`. |

### Sobregasto (05D)

| ID | Regla |
|---|---|
| BR-ENG-030 | **Efectivo:** `Comida disponible 100` + compra en efectivo `150` ⇒ `disponible −50`, `cash_overspent = 50`, estado `CASH_OVERSPENT` (rojo, urgente). |
| BR-ENG-031 | **Mes siguiente:** el Disponible de esa categoría vuelve a `0` (BR-ENG-010) y el sobregasto se descuenta de Por asignar del mes siguiente (`CO(M)` en A5.4). Ej.: Sept. −50 ⇒ Oct. `disponible 0`, `impacto en RTA −50`, advertencia urgente. |
| BR-ENG-032 | **Tarjeta:** `Comida disponible 50` + compra con tarjeta `100` ⇒ `funded = 50`, `credit_overspent = 50` (amarillo). La parte sin fondos es **deuda nueva**, no falta de efectivo. Si hay sobregasto mixto se cubre primero el de efectivo (A5.2). |

### Por asignar (05B)

| ID | Regla |
|---|---|
| BR-ENG-040 | No se implementa `RTA = efectivo_líquido − asignado_total`. Se usa A5.4, que conoce saldos iniciales, ingresos, asignaciones, desasignaciones, movimientos, meses futuros, efectos del sobregasto, tarjetas y ajustes. |
| BR-ENG-041 | **Aumentan** Por asignar: saldo inicial de cuenta on-budget · ingreso a `inflow_rta` · reembolso devuelto a Por asignar · desasignar · mover dinero fuera de una categoría hacia Por asignar · reducir sobre-financiación · *Reset Available*. |
| BR-ENG-042 | **No** aumentan Por asignar: transferencia entre cuentas on-budget · mover entre categorías · arrastre positivo · compra con tarjeta · actividad de categoría · marca de conciliación. |
| BR-ENG-043 | **Ingreso directo a categoría** (`reembolso Amazon +100` en `Electrónica`): `Electrónica.Disponible += 100`, `RTA += 0`. Comportamiento explícito y soportado, no un truco. |

### Asignar y mover (05A)

| ID | Regla |
|---|---|
| BR-ENG-050 | Toda asignación es un **evento** (`ASSIGN, UNASSIGN, MOVE_IN, MOVE_OUT, RESET, SYSTEM_ADJUSTMENT`). `category_months.assigned_minor` = Σ de deltas de sus eventos (invariante verificada). Nunca se modifica el histórico. |
| BR-ENG-051 | `assignMoney` corre en **una transacción**: bloquear presupuesto/mes → calcular RTA → validar monto → crear evento → actualizar agregado → auditoría → `COMMIT`. React **nunca** cambia `assigned_minor`. |
| BR-ENG-052 | Con `strict_budgeting` **apagado** (ADR-G12) se permite asignar más que el RTA; el RTA queda rojo y se emite `RTA_NEGATIVE`. Con `strict_budgeting` **encendido** ⇒ `ASSIGN_EXCEEDS_AVAILABLE`. |
| BR-ENG-053 | **Mover dinero:** mismo presupuesto y mismo mes; delta neto `0`; origen con disponible ≥ monto salvo `override` explícito (`MOVE_INSUFFICIENT_AVAILABLE`); se registran **dos eventos** ligados por `movement_id` (fila de `budget_movements`, 02.5). |
| BR-ENG-054 | **Reset Available** (power-user): devuelve a Por asignar el disponible de la categoría generando eventos explícitos. |

### Auto-Assign (05E)

| ID | Regla |
|---|---|
| BR-ENG-060 | Flujo **siempre**: *elegir estrategia → calcular vista previa → mostrar cambios propuestos → el usuario confirma → persistir eventos*. Nunca se ejecuta al pulsar la estrategia. |
| BR-ENG-061 | `previewAutoAssign` devuelve `previewHash`; `applyAutoAssign` lo exige. Si el plan cambió ⇒ `AUTO_ASSIGN_PREVIEW_STALE`. |
| BR-ENG-062 | **Underfunded:** propone cubrir `FundingRequirement[]` en orden de ranking hasta agotar Por asignar (el último puede quedar parcial). 🟨 |
| BR-ENG-063 | **Assigned Last Month:** propone lo asignado el mes anterior (p. ej. 500). **No** usa el disponible anterior. |
| BR-ENG-064 | **Spent Last Month:** propone el gasto del mes anterior (actividad −430 ⇒ 430). Excluye transferencias. |
| BR-ENG-065 | **Average Assigned:** hasta **12** meses anteriores, **excluye el mes actual**. Si solo hay 4 meses válidos ⇒ promedio de 4. **No se inventan datos faltantes.** |
| BR-ENG-066 | **Average Spent:** misma ventana, con gasto categorizado neto de categorías de gasto; excluye transferencias. Los reembolsos se netean (modo por defecto, documentado); un modo opcional *gross spending* los excluye. |
| BR-ENG-067 | **Reduce Overfunding:** si `requerido por la meta = 500` y `disponible = 750`, propone devolver `250` a Por asignar. Nunca sin confirmar. |
| BR-ENG-068 | Meta en *snooze* queda fuera de Underfunded (Spec 06). |

### Requisitos de financiación y ranking (05E)

```ts
type FundingRequirement = {
  categoryId: string; amountRequired: Money; dueDate: string | null;
  priority: number; reason: string;
  sourceType: 'CASH_OVERSPENDING' | 'SCHEDULED_TRANSACTION' | 'TARGET' | 'CREDIT_CARD_PAYMENT' | 'LOAN_PAYMENT';
};
```

| ID | Regla |
|---|---|
| BR-ENG-070 | El ranking vive en **una sola función** `rankFundingRequirements()`. Orden inicial: 1 sobregasto en efectivo · 2 obligaciones programadas próximas · 3 metas del mes con fecha · 4 metas del mes · 5 metas a más largo plazo por fecha · 6 otras prioridades explícitas. 🟨 |

### Estado de categoría — salud (05A)

Enum de dominio (la UI lo traduce con la tabla de A1):

| Estado | Significado | Visual (A1) |
|---|---|---|
| `FUNDED` | financiada | ✓ esmeralda |
| `UNDERFUNDED` | falta asignar | ⚠ dorado |
| `CASH_OVERSPENT` | sobregasto en efectivo | ● peligro |
| `CREDIT_OVERSPENT` | sobregasto con tarjeta | ⚠ dorado |
| `OVERFUNDED` | más de lo que pide la meta | informativo |
| `SNOOZED` | meta pospuesta | neutro |
| `NO_TARGET` | sin meta | neutro "Sin meta" |
| `COMPLETED` | meta cumplida | ✓ positivo |

## 05.5 Modelo de datos

`category_months` (02.5) conserva **solo** `assigned_minor` (+ `version`). Disponible/actividad/sobregasto se **derivan** (ADR-G13, ADR-M2). Si se necesita caché de rendimiento se usa una tabla aparte `category_month_cache`, invalidable y **nunca fuente de verdad** (A13.3).

```sql
create table budget_assignment_events (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  category_id uuid not null,
  month date not null check (extract(day from month) = 1),
  action_type text not null check (action_type in ('ASSIGN','UNASSIGN','MOVE_IN','MOVE_OUT','RESET','SYSTEM_ADJUSTMENT')),
  amount_minor bigint not null check (amount_minor <> 0),        -- delta con signo sobre `assigned` (ASSIGN/MOVE_IN +, UNASSIGN/MOVE_OUT/RESET −)
  source_category_id uuid,                                        -- contraparte en MOVE_*; null = Por asignar
  movement_id uuid references budget_movements(id),               -- liga los 2 eventos de un movimiento
  actor_user_id uuid not null,
  source text not null default 'ui' check (source in ('ui','api','import','scheduled','ai','system')),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  foreign key (category_id, budget_id) references categories (id, budget_id),
  unique (budget_id, idempotency_key, category_id, action_type)
);
create index on budget_assignment_events (budget_id, month);
create index on budget_assignment_events (category_id, month);
-- Append-only: REVOKE UPDATE, DELETE. RLS: plantilla A8.3 (select VIEWER, insert EDITOR).
-- Invariante 05H: category_months.assigned_minor = Σ amount_minor de sus eventos.
```

## 05.6 Backend

### 05.6.1 Comandos y queries

| Comando | Entrada | Reglas / efecto | Errores |
|---|---|---|---|
| `assignMoney` | `budgetId, categoryId, month, amountMinor, idempotency_key` | BR-ENG-050..052 | `ASSIGN_EXCEEDS_AVAILABLE`, `CONFLICT_VERSION`, `MONTH_OUT_OF_RANGE` |
| `unassignMoney` | idem | evento `UNASSIGN` | idem |
| `moveMoney` | `budgetId, month, fromCategoryId, toCategoryId\|null, amountMinor, override?, idempotency_key` | BR-ENG-053 (`null` = a Por asignar) | `MOVE_SAME_CATEGORY`, `MOVE_INSUFFICIENT_AVAILABLE` |
| `resetAvailable` | `budgetId, categoryId, month` | BR-ENG-054 | – |
| `previewAutoAssign` | `budgetId, month, strategy, categoryIds?` | BR-ENG-060..068; **no muta** | – |
| `applyAutoAssign` | `previewHash, idempotency_key` | persiste eventos en una transacción | `AUTO_ASSIGN_PREVIEW_STALE` |

- **Queries:** `getBudgetSnapshot(budgetId, month)` (fachada única) · `getCategoryMonth(categoryId, month)` · `getBudgetOverview` (02.6.4, lee del snapshot).
- **Concurrencia:** transacción Postgres + `FOR UPDATE` del mes o versión optimista:
  `UPDATE category_months SET version=version+1 … WHERE id=$1 AND version=$2` ⇒ `rowCount=0` ⇒ `409 CONFLICT_VERSION`.
- **Idempotencia:** `idempotency_key` obligatorio en asignación, movimiento y auto-assign.
- **Rutas HTTP (`/api/v1`, mismas capas `application` que las server actions):** `POST /budgets/:id/assignments` · `GET /budgets/:id/overview` · `GET /budgets/:id/months/:month` · `GET /categories/:id/months/:month`.
- **DTO:** nunca se devuelven tablas SQL; `BudgetOverviewDTO`, `CategoryMonthDTO`, `CreditCardStatusDTO`, `GoalProgressDTO`… con dinero como `{minor: string, currency}`.

### 05.6.2 Extensión de `packages/budget-engine` (compatibilidad 0.3)

Puro, sin React/Next/Drizzle/Supabase. Archivos objetivo (los existentes se conservan; se añaden los que falten):

```text
money.ts  category-state.ts  rta.ts  rollover.ts  overspending.ts  goals.ts  auto-assign.ts  credit-card.ts  invariants.ts  snapshot.ts
```

```ts
type BudgetCalculationInput = {
  month: string; accounts: AccountSnapshot[]; transactions: TransactionSnapshot[];
  assignmentEvents: AssignmentEvent[]; categoryMonths: CategoryMonthSnapshot[];
  goals: GoalSnapshot[]; scheduledTransactions: ScheduledSnapshot[];
};
type BudgetCalculationResult = {
  readyToAssign: Money; categoryStates: CategoryState[]; creditCards: CreditCardState[];
  goals: GoalState[]; warnings: BudgetWarning[]; invariants: InvariantResult[];
};
```

**Orden de cálculo determinista:**

```text
1 cargar cuentas → 2 saldos de cuentas → 3 actividad de transacciones → 4 saldos de apertura por categoría →
5 aplicar eventos de asignación → 6 aplicar actividad de categoría → 7 semántica de transferencias →
8 movimientos de financiación de tarjetas → 9 reglas de sobregasto → 10 requisitos de metas → 11 calcular RTA →
12 construir requisitos de Auto-Assign → 13 ejecutar invariantes → 14 devolver resultado inmutable
```

**Invariantes (`invariants.ts`):** `assertSplitInvariant`, `assertTransferInvariant`, `assertRTAConsistency` (A5.4 = A5.5), `assertCurrencyConsistency`, `assertCreditCardConsistency`, `assertReconciliationConsistency`, `assertAssignedEqualsEvents`. En test: *fail-fast*. En producción: **log crítico + captura de snapshot** (A11.3). Cada resultado guarda `calculation_engine_version` (A13.5).

**Snapshot único:** `getBudgetSnapshot(budgetId, month)` → `{ month:'2026-09-01', readyToAssign, categories[], accounts[], creditCards[], goals[], warnings[] }`. Inicio y Presupuesto **deben** usar el mismo cálculo.

## 05.7 UI (por ampliar en `/speckit.clarify` con mockups)

- **Grilla de presupuesto** (`/b/[id]/budget?m=2026-09`): Asignado / Actividad / Disponible por categoría, edición inline con `CalcInput`, navegación de mes `[` `]`, mover dinero `M`, chips de salud (icono + texto, nunca solo color). Superficie **opaca** (A9.9).
- **Panel Auto-Assign:** lista de estrategias → **vista previa** (tabla de cambios propuestos con total) → botón *Confirmar*; sin auto-ejecución.
- **Barra Por asignar** (A9.1): verde `>0`, neutro `=0`, peligro `<0` con *"Asignaste Bs X de más"*.
- **Explicadores "¿Por qué?"** (A9.8) en Por asignar, Falta asignar y sobregastos.
- Modo simple/avanzado según A9.8. Estados de pantalla A9.3.

## 05.8 Casos borde

- Asignar a un mes futuro: no cambia el "disponible hoy" del usuario (BR-ENG-020).
- Categoría con sobregasto mixto (efectivo + tarjeta): se cubre primero el rojo.
- Categoría oculta con dinero: **sigue contando** en Por asignar (BR-CAT-010).
- Dos dispositivos asignan a la vez: ver GS-12 (resultado determinista, sin perder eventos).
- Promedio con menos de 12 meses: promedia los válidos (BR-ENG-065).
- Cambiar la fecha de una transacción a otro mes: se recalculan ambos meses (04.8).

## 05.9 Criterios de aceptación

```text
AC-ENG-01  Given cuenta corriente con Bs 1.000, categoría Comida y asignación de Bs 300
           When registra un gasto de Bs 100 en Comida
           Then Comida.disponible = Bs 200 y Por asignar = Bs 700.

AC-ENG-02  Given Sept.: Comida asignado 500, gastado 400
           When se abre Oct.
           Then apertura = 100 y no existe ningún ingreso en cuentas.

AC-ENG-03  Given Comida disponible 100 y compra en efectivo de 150 en Sept.
           Then Sept.: disponible −50 / cash_overspent 50; Oct.: disponible 0, Por asignar −50 y advertencia urgente.

AC-ENG-04  Given Comida disponible 50 y compra con tarjeta de 100
           Then credit_overspent 50, reservado para pagar 50, NO es sobregasto en efectivo.

AC-ENG-05  Given Por asignar 1300, alquiler programado 800, meta Comida 300, meta Transporte 200
           When previsualiza Auto-Assign "Falta asignar"
           Then propone Alquiler 800 / Comida 300 / Transporte 200; al confirmar, Por asignar = 0.

AC-ENG-06  Given una estrategia elegida
           When pulsa la estrategia
           Then no se guarda nada hasta confirmar la vista previa.

AC-ENG-07  Given una asignación en un mes futuro con Asignado negativo
           Then el snapshot trae future_assigned_negative = true y la advertencia FUTURE_NEGATIVE_ASSIGNED.

AC-ENG-08  Given Por asignar 400 y dos peticiones simultáneas "asignar 300" (GS-12)
           Then el resultado es determinista y no se pierde ningún evento.

AC-ENG-09  Given mover Bs 100 de Comida a Entretenimiento
           Then Por asignar antes = Por asignar después y existen 2 eventos con el mismo movement_id.
```

## 05.10 Tests requeridos

- **Unit:** cada fórmula A5.2–A5.4 con tabla de casos; `rankFundingRequirements`; cada estrategia de Auto-Assign (incl. ventanas de 4 y 12 meses); `categoryHealth`.
- **Property:** A5.4 = A5.5; mover no cambia RTA; asignar `X` ⇒ `RTA − X`; `assigned = Σ eventos`.
- **Integración:** `assignMoney`/`moveMoney` atómicos; versión optimista; idempotencia; `previewHash` obsoleto.
- **E2E:** GS-01, GS-07, GS-08, GS-09, GS-12 (Parte N).

## 05.12 No hacer

🟥 `RTA = efectivo − asignado` · 🟥 sumar `previous_available + rollover` · 🟥 guardar `available`/`activity` como fuente de verdad · 🟥 mutar `assigned_minor` desde React o sin evento · 🟥 ejecutar Auto-Assign sin vista previa · 🟥 tratar una asignación futura como dinero recibido · 🟥 duplicar el cálculo de RTA en Inicio/Presupuesto/Tarjetas · 🟥 llamadas de red dentro de la transacción de asignación.

---
