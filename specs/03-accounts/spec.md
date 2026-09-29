# SPEC 03 — ACCOUNTS

**Dependencias:** 02. **Hito:** M1. **Prefijos:** `FR-ACC`, `BR-ACC`.

## 03.1 Cómo funciona YNAB (🟦)

- Hay **tres familias de cuentas**: *de presupuesto* (corriente, ahorro, efectivo, tarjeta de crédito), *de préstamo* y *de seguimiento* (activos como inversiones; pasivos como deudas entre personas o líneas de crédito). **El dinero de las cuentas de seguimiento no forma parte del plan**: solo se sigue su saldo.
- Al agregar una cuenta se pide **nombre, tipo y saldo actual**. El saldo se registra como una transacción **"Starting Balance"**. En una cuenta de presupuesto con saldo positivo, ese dinero entra a **Ready to Assign**.
- Una tarjeta de crédito con deuda previa entra con **saldo inicial negativo**; como esas compras ocurrieron antes de usar la app, **no se mueve dinero automáticamente** a su categoría de pago: hay que asignarlo directamente.
- Cada cuenta muestra tres saldos: **Cleared** (confirmado en el banco), **Uncleared** (pendiente) y **Working** (suma de ambos; es el que alimenta el plan). Por eso se recomienda conciliar seguido.
- La barra lateral agrupa las cuentas (presupuesto / seguimiento / cerradas) con su saldo; se pueden **reordenar**, **editar** (nombre, nota) y **cerrar** (conserva su historial).
- Las cuentas pueden estar **vinculadas** al banco (importación directa) o **sin vincular** (manual/archivos).

## 03.2 Qué hará Bolsilludo

| Capacidad | Tipo |
|---|---|
| Tipos: `CHECKING`, `SAVINGS`, `CASH`, `CREDIT_CARD` (en presupuesto); `LOAN`, `INVESTMENT`, `OTHER_ASSET`, `OTHER_LIABILITY` (seguimiento) | 🟦 paridad (plan §15) |
| Saldo inicial como transacción; categoría según tipo (ver BR-ACC-010..013) | 🟦 paridad |
| Saldos **derivados** (total/confirmado/pendiente/conciliado) por función SQL; **nunca columnas mutables** | 🟩 mejora (ADR-G13; evita bug #8) |
| Barra lateral con totales por sección y contadores de "por revisar" | 🟦 + 🟩 |
| Crear cuenta en 3 pasos con **vista previa del efecto** en Por asignar | 🟩 mejora |
| Cerrar cuenta con **asistente "Cerrar y transferir saldo"** | 🟩 mejora |
| Campos de tarjeta: día de corte, día de vencimiento, límite, TNA (opcionales; alimentan Spec 07/10) | 🟩 mejora |
| 🟨 `LOAN` se trata como **cuenta de seguimiento (pasivo)** en Fase 1; el Debt Planner (Spec 21) la ampliará (ADR-G17) | Decisión |
| 🟨 **Los traspasos no usan filas de `payees`**: el "comercio" de una transferencia se deriva de la cuenta contraparte (ADR-G18) | Decisión |
| 🟨 Saldos "de hoy" excluyen transacciones con fecha futura; se ofrece además saldo proyectado (ADR-G8) | Decisión |

## 03.3 Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-ACC-001 | `EDITOR+` puede crear una cuenta indicando tipo, nombre, saldo actual y fecha. |
| FR-ACC-002 | Al crear una tarjeta, el sistema crea su categoría "Pago de tarjeta" (Spec 07) en la misma transacción. |
| FR-ACC-003 | La barra lateral lista cuentas por sección con saldo total y permite reordenar. |
| FR-ACC-004 | Cada cuenta muestra saldo total, confirmado, pendiente y conciliado. |
| FR-ACC-005 | `EDITOR+` puede editar nombre, nota, subtipo y datos de tarjeta. |
| FR-ACC-006 | `EDITOR+` puede cerrar y reabrir una cuenta; cerrar conserva el historial. |
| FR-ACC-007 | Cuentas de seguimiento permiten "Actualizar saldo" (ajuste sin categoría). |
| FR-ACC-008 | Una cuenta creada por error, sin movimientos propios, puede descartarse. |

## 03.4 Reglas de negocio

| ID | Regla |
|---|---|
| BR-ACC-001 | Nombre: `trim`, 1–50; único (case-insensitive) entre cuentas **no cerradas** del presupuesto. |
| BR-ACC-002 | `currency` de la cuenta = `budgets.currency` (CHECK + validación). Multi-moneda llega en Spec 13. |
| BR-ACC-003 | `is_on_budget` **se deriva del tipo**: `CHECKING/SAVINGS/CASH/CREDIT_CARD` ⇒ true; el resto ⇒ false. Constraint en BD. |
| BR-ACC-004 | Cambiar tipo solo dentro de `{CHECKING,SAVINGS,CASH}`; cualquier otro cambio ⇒ `ACCOUNT_TYPE_CHANGE_UNSUPPORTED` (añadir a A6). |
| BR-ACC-005 | Convención de signo del saldo: activos positivos; **pasivos negativos** (una deuda de Bs 850 es `-85000`). En el formulario el usuario escribe "cuánto debes" en positivo y el sistema guarda negativo. |
| BR-ACC-010 | **Saldo inicial** = transacción `kind='starting_balance'`, `status='CLEARED'`, fecha = `opened_on` (defecto hoy), nota "Saldo inicial", sin `payee_id`. |
| BR-ACC-011 | Cuenta on-budget **no tarjeta** (corriente/ahorro/efectivo): categoría = `inflow_rta`. Saldo positivo ⇒ suma a Por asignar; negativo (sobregiro) ⇒ resta (RTA rojo). |
| BR-ACC-012 | `CREDIT_CARD`: saldo inicial **negativo o cero** (positivo ⇒ `VALIDATION_FAILED` en Fase 1, ADR-G4; un saldo positivo **sí** puede aparecer después por sobrepago: estado `POSITIVE_CREDIT_BALANCE`, Spec 07), **sin categoría**; no mueve dinero a Pago de tarjeta (🟦). La UI explica: "Para pagar esta deuda, asigna dinero a *Pago Visa*." |
| BR-ACC-013 | Cuentas de seguimiento: saldo inicial **sin categoría**; no afectan Por asignar. |
| BR-ACC-020 | El saldo **nunca** se almacena: se calcula (03.5.2). Invariante I3: `balance = Σ transacciones no anuladas`. |
| BR-ACC-021 | Definiciones (con fecha de corte `as_of`, por defecto hoy en la tz del presupuesto): **total** = Σ `PENDING+CLEARED+RECONCILED`; **confirmado** = Σ `CLEARED+RECONCILED`; **conciliado** = Σ `RECONCILED`; **pendiente** = total − confirmado. Excluyen `VOIDED`. Solo cuentan transacciones con `date ≤ as_of`. **Proyectado** = sin filtro de fecha. |
| BR-ACC-030 | **Cerrar** una cuenta: exige `total = 0` y sin programadas activas (`ACCOUNT_NOT_ZERO_BALANCE`, `ACCOUNT_HAS_ACTIVE_SCHEDULES`). El asistente "Cerrar y transferir" crea una transferencia por el saldo restante a otra cuenta del mismo tipo de familia y luego cierra. |
| BR-ACC-031 | Cuenta cerrada: `closed_at`; no admite nuevas transacciones (`ACCOUNT_CLOSED`); su historial sigue en reportes y sus transacciones siguen afectando categorías pasadas; su categoría de Pago de tarjeta se oculta si `end = 0`. |
| BR-ACC-032 | **Reabrir**: limpia `closed_at`; desoculta su Pago de tarjeta. |
| BR-ACC-033 | **Descartar** (`discardAccount`): solo si las únicas transacciones son el saldo inicial y ninguna está conciliada; anula el saldo inicial, archiva la cuenta y su categoría de pago. |
| BR-ACC-040 | `note` ≤ 500; `statement_day`, `payment_due_day` ∈ 1..31 (se ajustan al último día del mes cuando aplique); `credit_limit_minor ≥ 0`; `apr_bps` ∈ 0..100000. Solo tarjetas/préstamos. |
| BR-ACC-050 | `position` denso por sección (`budget`, `tracking`, `closed`). Reordenar solo dentro de la sección. |

## 03.5 Modelo de datos

### 03.5.1 Tabla

```sql
create table accounts (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  type text not null check (type in ('CHECKING','SAVINGS','CASH','CREDIT_CARD','LOAN','INVESTMENT','OTHER_ASSET','OTHER_LIABILITY')),
  subtype text check (char_length(subtype) <= 40),          -- p. ej. 'dpf','jubilacion' (solo etiqueta)
  is_on_budget boolean not null,
  currency char(3) not null,
  opened_on date not null,
  note text check (char_length(note) <= 500),
  institution text check (char_length(institution) <= 80),
  statement_day smallint check (statement_day between 1 and 31),
  payment_due_day smallint check (payment_due_day between 1 and 31),
  credit_limit_minor bigint check (credit_limit_minor >= 0),
  apr_bps int check (apr_bps between 0 and 100000),
  position int not null check (position >= 0),
  closed_at timestamptz,
  discarded_at timestamptz,
  external_account_id text,                                  -- Spec 09/futuro
  connection_id uuid,                                        -- futuro (banking)
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (id, budget_id),
  check (is_on_budget = (type in ('CHECKING','SAVINGS','CASH','CREDIT_CARD'))),
  check (statement_day is null or type in ('CREDIT_CARD','LOAN'))
  -- la igualdad currency = budgets.currency la garantiza el trigger accounts_currency_guard (abajo)
);
create unique index accounts_name_uq on accounts (budget_id, lower(name)) where closed_at is null and discarded_at is null;
create index on accounts (budget_id, is_on_budget, position) where discarded_at is null;

-- FK diferida de categorías de Pago de tarjeta (definida en Spec 02)
alter table categories add foreign key (linked_account_id, budget_id) references accounts (id, budget_id);

-- Trigger: currency de la cuenta = currency del presupuesto (Fase 1)
create function accounts_currency_guard() returns trigger language plpgsql as $$
begin
  if new.currency <> (select currency from budgets where id = new.budget_id) then
    raise exception 'ACCOUNT_CURRENCY_MISMATCH';
  end if;
  return new;
end $$;
create trigger accounts_currency_guard_t before insert or update of currency on accounts
  for each row execute function accounts_currency_guard();
```

### 03.5.2 Saldos derivados (fuente única)

La tabla `transactions` se define en la Spec 04; esta función se crea **en la migración de transacciones** (T04.x) y se usa aquí.

```sql
create function account_balances(p_budget uuid, p_as_of date)
returns table (account_id uuid, total_minor bigint, cleared_minor bigint, reconciled_minor bigint,
               uncleared_minor bigint, projected_minor bigint)
language sql stable as $$
  select a.id,
    coalesce(sum(t.amount_minor) filter (where t.date <= p_as_of), 0)                                        as total_minor,
    coalesce(sum(t.amount_minor) filter (where t.date <= p_as_of and t.status in ('CLEARED','RECONCILED')), 0) as cleared_minor,
    coalesce(sum(t.amount_minor) filter (where t.date <= p_as_of and t.status = 'RECONCILED'), 0)             as reconciled_minor,
    coalesce(sum(t.amount_minor) filter (where t.date <= p_as_of and t.status = 'PENDING'), 0)                as uncleared_minor,
    coalesce(sum(t.amount_minor), 0)                                                                          as projected_minor
  from accounts a
  left join transactions t on t.account_id = a.id and t.status <> 'VOIDED'
  where a.budget_id = p_budget and a.discarded_at is null
  group by a.id
$$;
```

Índice necesario: `transactions (account_id, date) where status <> 'VOIDED'` (ver Spec 04). Test de equivalencia: `Σ total_minor` de todas las cuentas = `Σ amount_minor` de todas las transacciones no anuladas con `date <= as_of` (I3).

**RLS:** plantilla A8.3 (`select` VIEWER, escritura EDITOR). `discard`/`close` = EDITOR.

## 03.6 Backend

### 03.6.1 Comandos

| Comando | Entrada | Validaciones | Efecto (1 transacción) | Errores | Auditoría |
|---|---|---|---|---|---|
| `createAccount` | `budgetId, name, type, subtype?, openedOn?, startingBalanceMinor, note?, institution?, card{statementDay,dueDay,limitMinor,aprBps}?, idempotency_key` | BR-ACC-001..005,010..013,040; `EDITOR+`; fecha en rango A3 | inserta `accounts` (posición al final de su sección); inserta `starting_balance` (BR-ACC-010..013); si `CREDIT_CARD`: crea grupo de sistema "Pagos de tarjetas" si falta y la categoría `credit_card_payment` (nombre = cuenta) | `VALIDATION_FAILED`, `CATEGORY_DUPLICATE_NAME` (no debe ocurrir; se sufija) | `account.created` |
| `updateAccount` | `accountId, patch, version` | BR-ACC-001,004,040 | `UPDATE … version`; si cambia `name` y es tarjeta ⇒ renombra su Pago de tarjeta | `CONFLICT_VERSION`, `ACCOUNT_TYPE_CHANGE_UNSUPPORTED` | `account.updated` |
| `reorderAccounts` | `budgetId, section, orderedIds[]` | BR-ACC-050 | reindexa denso | `CONFLICT_VERSION` | `account.reordered` |
| `closeAccount` | `accountId, transferTo?: accountId, version` | BR-ACC-030 | (si `transferTo`) crea transferencia por saldo total (Spec 04 `transferMoney`) → `closed_at=now()`; oculta Pago de tarjeta | `ACCOUNT_NOT_ZERO_BALANCE`, `ACCOUNT_HAS_ACTIVE_SCHEDULES`, `TRANSFER_*` | `account.closed` |
| `reopenAccount` | `accountId` | BR-ACC-032 | limpia `closed_at` | – | `account.reopened` |
| `discardAccount` | `accountId` | BR-ACC-033 | anula saldo inicial, `discarded_at` | `VALIDATION_FAILED` | `account.discarded` |
| `updateTrackingBalance` | `accountId, newBalanceMinor, date` | solo `is_on_budget=false` | crea transacción `kind='reconciliation_adjustment'` por la diferencia (sin categoría) | `VALIDATION_FAILED` | `account.balance_updated` |

### 03.6.2 Queries

- `listAccounts(budgetId, asOf?)` → 

```ts
type AccountRow = { id; name; type; subtype?; isOnBudget; closed: boolean;
  balances: { total: Money; cleared: Money; reconciled: Money; uncleared: Money; projected: Money };
  needsReview: { unapproved: number; uncategorized: number };
  lastReconciledAt: string|null; position: number };
type AccountsOverview = {
  sections: { budget: AccountRow[]; tracking: AccountRow[]; closed: AccountRow[] };
  totals: { onBudgetCash: Money;        // CHECKING+SAVINGS+CASH (total)
            creditDebt: Money;          // Σ CREDIT_CARD.total (negativo)
            trackingAssets: Money; trackingLiabilities: Money };
};
```
- `getAccount(accountId, asOf?)` → `AccountRow` + datos de tarjeta.

Reglas de cálculo de `totals`: **nunca mezclar** cash y deuda en un solo número sin etiqueta; el "Disponible" del Inicio = `onBudgetCash`; la deuda de tarjetas se muestra aparte.

## 03.7 UI

### 03.7.1 Barra lateral de cuentas

```text
CUENTAS
▾ Presupuesto                     Bs 2.150
   Cuenta corriente BNB           Bs 1.850   ●3   (● = por revisar)
   Efectivo                       Bs   300
   Visa Gold                     −Bs   850   ⚠    (tarjeta con déficit, Spec 07)
▸ Seguimiento                     Bs 12.000
▸ Cerradas (2)
[ + Agregar cuenta ]
```

- Cabecera de sección: total; en presupuesto se muestra **efectivo** y, entre paréntesis, deuda de tarjetas si existe.
- Fila: nombre, saldo **total** (`MoneyText`). Saldos negativos: en tarjetas/pasivos se muestran en tono neutro con sufijo "deuda" (un saldo negativo de tarjeta es normal); en cuentas de efectivo **sí** se muestra `--danger` + icono (sobregiro).
- Badge `●n` = pendientes de aprobar; hover: "3 transacciones por revisar".
- Arrastrar para reordenar (con alternativa de teclado `Alt+↑/↓`) dentro de la sección.
- Menú `⋯`: Editar · Conciliar (Spec 08) · Cerrar… · Descartar (si aplica).
- Móvil: pestaña "Cuentas" con la misma lista; tocar abre el registro.

### 03.7.2 Asistente "Agregar cuenta" (Sheet de 3 pasos)

| Paso | Contenido |
|---|---|
| 1 Tipo | Dos grupos: **Del presupuesto** (Cuenta corriente, Caja de ahorro, Efectivo, Tarjeta de crédito) y **Seguimiento** (Inversión, Otro activo (DPF, terreno…), Préstamo, Otra deuda). Cada tarjeta con una línea que explica su efecto: "El dinero de esta cuenta se puede asignar" / "Solo sigue su saldo; no afecta tu presupuesto". |
| 2 Datos | Nombre (con sugerencia "Cuenta corriente BNB"), banco (opcional), moneda (chip de solo lectura = moneda del presupuesto); para tarjetas: día de corte, día de vencimiento, límite (opcionales). |
| 3 Saldo | Etiqueta según tipo: efectivo/ahorro → "¿Cuánto hay en esta cuenta?"; tarjeta → "¿Cuánto debes hoy?"; seguimiento → "Saldo actual". `CalcInput` (P14) + fecha (defecto hoy). **Vista previa** en vivo: *"Por asignar +Bs 1.200"* / *"Esta deuda no se descuenta de tu presupuesto. Para pagarla asigna dinero a «Pago Visa»"* / *"No afecta tu presupuesto"*. |

Botón final **Agregar cuenta**; si la moneda/tipo son inválidos, el paso vuelve con error inline. Primer uso: tras crear, CTA "Registrar un ingreso" o "Asignar dinero".

### 03.7.3 Encabezado de cuenta (Nivel 2, plan §58A.2)

`[← Cuentas]  Cuenta corriente BNB` · Saldos: **Total Bs 1.850** · Confirmado Bs 1.800 · Pendiente Bs 50 · (conciliado hasta 12 sep 🔒) · Botones: **Agregar movimiento** · **Conciliar** · `⋯`. El registro de transacciones (Spec 04) se monta debajo.

### 03.7.4 Cerrar cuenta
Modal: si `total ≠ 0` → "Esta cuenta tiene Bs X. ¿A dónde los transfieres?" (selector de cuentas de la misma familia) → "Cerrar y transferir". Si hay programadas → lista con opción "Pausar y cerrar". Confirmación deshacible (reabrir) por 30 s en toast.

## 03.8 Casos borde

- Saldo inicial `0`: se crea igualmente la transacción de `0`? **No**: `AMOUNT_ZERO` aplica a transacciones normales; el saldo inicial 0 **omite** la transacción (la cuenta existe sin movimientos).
- Cuenta con 2 tarjetas de igual nombre (después de cerrar una) → permitido (unicidad solo entre abiertas); el Pago de tarjeta se sufija "(2)" si colisiona en el grupo.
- Fecha de saldo inicial en el pasado (antes de `start_month`): permitido; el RTA del `start_month` ya la incluye (I acumulado ≤ fin de mes).
- Cuenta on-budget con saldo inicial negativo → RTA negativo inmediato; la UI lo advierte en el paso 3 y no lo bloquea.
- Cerrar tarjeta con Pago de tarjeta con dinero (`end > 0`) y deuda `0` → el dinero sobrante permanece en esa categoría oculta; el asistente ofrece "Mover a Por asignar" (crea `budget_movements`).
- Zona horaria: `opened_on` es `DATE` local; no se convierte.

## 03.9 Criterios de aceptación

```text
AC-ACC-01  Given presupuesto vacío
           When crea "Corriente BNB" CHECKING con saldo Bs 1.200
           Then existe 1 transacción starting_balance +120000 CLEARED en inflow_rta y Por asignar = Bs 1.200.

AC-ACC-02  Given crea tarjeta "Visa" con deuda Bs 375
           Then el saldo es −37500, no hay categoría en el saldo inicial, existe categoría "Visa" en "Pagos de tarjetas" y Por asignar NO cambia.

AC-ACC-03  Given tarjeta con saldo positivo ingresado
           Then VALIDATION_FAILED con mensaje explicativo (ADR-G4).

AC-ACC-04  Given una cuenta de inversión (seguimiento) con Bs 12.000
           Then Por asignar no cambia y aparece en "Seguimiento" con su total.

AC-ACC-05  Given cuenta con total ≠ 0
           When intenta cerrar sin transferir
           Then ACCOUNT_NOT_ZERO_BALANCE; con "Cerrar y transferir" el total pasa a 0 y closed_at se establece.

AC-ACC-06  Given cuenta con transacciones futuras
           Then total (hoy) excluye las futuras y projected las incluye.

AC-ACC-07  Given dos usuarios reordenan a la vez
           Then el segundo recibe CONFLICT_VERSION y la lista se refresca.

AC-ACC-08  Given un VIEWER
           Then no ve "Agregar cuenta" y la API rechaza con PERMISSION_DENIED.

AC-ACC-09  Given una cuenta creada por error sin otros movimientos
           When la descarta
           Then desaparece de la barra, su saldo inicial queda anulado y Por asignar vuelve a su valor previo.
```

## 03.10 Tests requeridos

- **Unit:** `deriveIsOnBudget(type)`, `startingBalanceRule(type, amount)` (tabla), `signForLiability`.
- **Property:** `Σ balances = Σ transacciones no anuladas` con `as_of` aleatorio y transacciones aleatorias (I3).
- **Integración:** `createAccount` atómico (incluye categoría de pago), trigger de moneda, índice único de nombre, FK compuesta de `categories.linked_account_id`.
- **E2E:** agregar 3 cuentas (efectivo, corriente, tarjeta) y comprobar Por asignar, sidebar y cierre.

## 03.12 No hacer

🟥 Columnas `current_balance/cleared_balance` mutables · 🟥 mezclar deuda de tarjetas dentro del "Disponible" · 🟥 cambiar `is_on_budget` a mano · 🟥 permitir cuentas en otra moneda antes de Spec 13 · 🟥 borrar cuentas con historial · 🟥 crear el saldo inicial sin transacción (debe ser un movimiento auditable) · 🟥 crear filas de `payees` para traspasos.

---
