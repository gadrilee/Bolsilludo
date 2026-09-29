# PARTE A — FUNDAMENTOS TRANSVERSALES (OBLIGATORIOS PARA TODAS LAS SPECS)

## A1. Glosario YNAB → Bolsilludo (textos de UI en español, es-BO)

| Concepto YNAB | Término en Bolsilludo (UI) | Nombre técnico |
|---|---|---|
| Plan / Budget | Presupuesto | `budget` |
| Ready to Assign (RTA) | **Por asignar** | `rta` |
| Inflow: Ready to Assign (categoría) | Ingreso: por asignar | categoría de sistema `kind='inflow_rta'` |
| Category / Group | Categoría / Grupo | `category` / `category_group` |
| Assigned | Asignado | `assigned_minor` |
| Activity | Actividad (modo simple: "Gastado") | `activity_minor` |
| Available | Disponible | `available_minor` |
| Target | Meta | `goal` |
| Underfunded | Falta asignar | `underfunded_minor` |
| Cash overspending (rojo) | Sobregasto en efectivo | `cash_overspent` |
| Credit overspending (amarillo) | Sobregasto con tarjeta | `credit_overspent` |
| Credit Card Payment category | Pago de tarjeta | categoría `kind='credit_card_payment'` |
| Cleared / Uncleared | Confirmada / Pendiente | `CLEARED` / `PENDING` |
| Reconciled (candado) | Conciliada 🔒 | `RECONCILED` |
| Working balance | Saldo total (incluye pendientes) | `working_balance` |
| Cleared balance | Saldo confirmado | `cleared_balance` |
| Payee | Comercio o persona | `payee` |
| Memo | Nota | `memo` |
| Flag | Marca de color | `flag_color` |
| Approve (imported) | Aprobar | `is_approved` |
| Budget / Tracking account | Cuenta del presupuesto / de seguimiento | `is_on_budget` true/false |
| Move Money | Mover dinero | `moveMoney` |
| Rollover | Arrastre | `start_available` |
| Age of Money | Edad del dinero | `age_of_money` |
| Scheduled transaction | Transacción programada | `scheduled_transaction` |

### Estados visuales semánticos (color **nunca** es el único canal: siempre icono + texto)

| Estado | Token | Icono | Ejemplo de texto |
|---|---|---|---|
| Saludable / financiado | `--primary` (esmeralda) | ✓ | "Financiada" |
| Atención (sobregasto con tarjeta, falta asignar) | `--accent` (dorado; en claro `#7A5800` para texto) | ⚠ | "Falta asignar Bs 40" |
| Crítico (sobregasto en efectivo, sobre-asignado) | `--danger` | ● / ! | "Sobregasto Bs 30" |
| Informativo / neutro (0, sin meta) | `--text-muted` | – | "Sin meta" |

## A2. Dinero, signos y redondeo (Constitution P1, P2)

- **Almacenamiento:** `amount_minor BIGINT` + `currency CHAR(3)`. Precisión desde tabla `currencies(code, minor_unit)` (BOB=2, USD=2, JPY=0).
- **Dominio TS:** tipo marca `Minor` (bigint o number entero seguro, **lo que ya exporte `@bolsilludo/money`**; no mezclar). En el límite BD↔dominio se valida `Number.isSafeInteger` si se usa `number`.
- **Signo (de la cuenta):** entrada de dinero a la cuenta **positivo**; salida **negativo**. Un gasto de Bs 50 = `-5000`.
- **Actividad de categoría:** suma con signo de las líneas (gasto negativo).
- **Asignado:** puede ser negativo (equivale a quitar dinero); el disponible no puede "crear" dinero (ver BR-ENG).
- **Redondeo de divisiones** (CalcInput, splits, reparto): política de plan §140: `floor` a unidad menor y el **resto se suma a la última línea** de forma determinista. Ej.: `100.00 / 3 → 33.33, 33.33, 33.34`.
- **Formato de presentación:** `Intl.NumberFormat('es-BO', { style:'currency', currency })`. Ejemplo: `Bs 1.234,50`. La preferencia del usuario (`number_format`) puede sobrescribir separadores.
- 🟥 **NO HACER:** `parseFloat`, `toFixed` para cálculos, sumar en `number` decimal, almacenar strings formateados, comparar dinero con `==` sobre decimales.

- **Preparación multi-moneda:** todo monto financiero lleva `currency_code`/`currency` aunque en Fase 1 el presupuesto tenga una sola moneda (no bloquea la Spec 13). **Nunca se suman monedas distintas sin un FX explícito**, y **nunca se recalcula una transacción histórica con la tasa actual** (se guardan `from_currency, to_currency, rate, source, valid_at`). Ver Parte C.

## A3. Fechas, meses y zona horaria

- **`transactions.date` es tipo `DATE`** (día calendario local del presupuesto), **no** `timestamptz`. Evita el bug de "gasto que cae en el mes equivocado por zona horaria".
- **Mes de presupuesto:** `month DATE` = primer día del mes (`2026-09-01`). Función única `monthOf(date) = date_trunc('month', date)::date`. Constraint `CHECK (extract(day from month) = 1)`.
- **"Hoy" = fecha actual en la zona horaria del presupuesto** (`budgets.timezone`, por defecto la del perfil del creador; ej. `America/La_Paz`). Toda lógica de "vencido / futuro / mes actual" usa `todayInBudgetTz(budget)`; jamás `new Date()` sin zona.
- **Timestamps de auditoría** (`created_at`, `updated_at`, `voided_at`): `timestamptz` en UTC.
- **Rango válido de fechas de transacción:** `1990-01-01` … `hoy + 10 años`. Fuera de rango → `VALIDATION_FAILED`.
- **Meses futuros:** navegables; no crean dinero (BR-ENG-020).
- **Ancla de recurrencias:** las series se calculan desde una *ancla* (ver Spec 10), nunca sumando al resultado anterior (evita "31 ene → 28 feb → 28 mar").

- **Fecha financiera vs fechas del banco:** `transactions.date` (tipo `DATE`) es la **única** fecha que usa el motor. Un banco puede informar `authorized_date` y `posted_date`; se guardan como datos auxiliares (`authorized_date`, y el resto en el payload crudo, Spec 09) pero **no** alimentan cálculos.

## A4. Identificadores, versiones, idempotencia, borrado

- **PK:** `uuid` (`gen_random_uuid()`; se admite UUIDv7 si la librería está disponible). Nunca autoincrementales expuestos al cliente.
- **Columnas estándar** en tablas mutables: `created_at timestamptz default now()`, `updated_at timestamptz` (trigger), `version int not null default 1` (concurrencia optimista), `created_by uuid`.
- **Concurrencia optimista:** todo `UPDATE` de entidades editables incluye `WHERE id=:id AND version=:v` y hace `version=version+1`; 0 filas ⇒ `CONFLICT_VERSION` (HTTP 409). La UI muestra: *"Este dato cambió desde otro dispositivo. Actualizamos la vista."*
- **Idempotencia:** comandos con efecto externo o reintentables (importar, aplicar propuesta de IA, job de programadas, aceptar invitación) reciben `idempotency_key` (UUID del cliente). Tabla:

```sql
create table idempotency_keys (
  user_id uuid not null,
  key uuid not null,
  command text not null,
  request_hash text not null,          -- sha256 del payload canónico
  response jsonb,
  status text not null check (status in ('in_progress','done','failed')),
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);
```
  Mismo `key` + mismo `request_hash` ⇒ devuelve la respuesta guardada. Mismo `key` + distinto hash ⇒ `VALIDATION_FAILED`.
- **Integridad entre presupuestos:** padres con `UNIQUE (id, budget_id)` e hijos con **FK compuesta** `(parent_id, budget_id) → parent(id, budget_id)`. Así una transacción **no puede** apuntar a una cuenta de otro presupuesto aunque el código falle.
- **Borrado:** ver P3/§100: `voided_at`, `archived_at`, `closed_at`. Los `DELETE` físicos solo existen en datos efímeros (invitaciones vencidas, `idempotency_keys` > 30 días, `import_rows` tras retención).

## A5. Fórmulas canónicas (fuente única — Constitution P5, plan I4/I5)

> Cualquier pantalla, reporte o IA usa **estas** funciones. Viven en `packages/budget-engine`.
> Se documentan aquí porque son la causa nº 1 de bugs si cada capa las reinterpreta.

### A5.1 Notación

```text
B        presupuesto             M        mes (primer día)          c        categoría (no sistema-ingreso)
p(card)  categoría "Pago de tarjeta" enlazada a la cuenta CREDIT_CARD `card`

líneas(c,M,k)  = líneas de transacción NO anuladas, en cuentas on-budget, con categoría c y fecha en M,
                 k ∈ {cash, credit}: credit si la cuenta es CREDIT_CARD; cash en cualquier otro caso.
                 Una transacción dividida aporta sus SPLITS (no el padre).
cash_net(c,M)   = Σ amount de líneas(c,M,cash)              (gasto → negativo)
credit_net(c,M) = − Σ amount de líneas(c,M,credit)          (gasto con tarjeta → positivo; reembolso → negativo)
assigned(c,M)   = category_months.assigned_minor (0 si no hay fila)
start(c,M)      = max(0, end(c, M−1))                       start(c, primer mes) = 0
```

### A5.2 Categoría normal

```text
base(c,M)  = start(c,M) + assigned(c,M) + cash_net(c,M)
end(c,M)   = base(c,M) − credit_net(c,M)                    -- "Disponible" mostrado
activity   = cash_net − credit_net                          -- "Actividad" mostrada (con signo)

funded(c,M)= si credit_net ≥ 0 : min(credit_net, max(0, base))     -- lo que se mueve a Pago de tarjeta
             si credit_net < 0 : credit_net                          -- reembolso: sale de Pago de tarjeta (ADR-G3)

cash_overspent(c,M)   = min( max(0,−end), max(0,−base) )
credit_overspent(c,M) = max(0,−end) − cash_overspent
```

> 🟦 Coincide con el comportamiento documentado: si hay sobregasto mezclado, el rojo (efectivo) se cubre primero y
> el amarillo (tarjeta) permanece hasta cubrirse; al añadir dinero a una categoría con sobregasto de tarjeta, ese dinero
> fluye automáticamente a su categoría de Pago de tarjeta.

### A5.3 Categoría "Pago de tarjeta" `p(card)`

```text
funded_in(p,M)   = Σ_c funded(c,M) repartido por tarjeta (ver 07.4 BR-CC-030 reparto proporcional determinista)
payments(p,M)    = Σ transferencias del presupuesto (cuenta no-tarjeta on-budget) → card en M   (monto positivo)
base(p,M)        = start(p,M) + assigned(p,M) + funded_in(p,M) − payments(p,M)
end(p,M)         = base(p,M)
cash_overspent(p,M) = max(0, −end(p,M))          -- pagaste más de lo apartado → rojo
```

### A5.4 Por asignar (RTA) — único estado canónico de dinero libre

```text
I(M)  = Σ amount de líneas con categoría de sistema 'inflow_rta' (on-budget, no anuladas, fecha ≤ último día de M)
A(M)  = Σ_{t ≤ M} Σ_c assigned(c,t)                          (incluye Pago de tarjeta y categorías ocultas)
CO(M) = Σ_{t < M} Σ_{c,p} cash_overspent(·,t)                (sobregasto en efectivo de meses ANTERIORES)
U(M)  = Σ |amount| de líneas SIN categoría, en cuentas on-budget NO tarjeta, que no son transferencia
        ni saldo inicial, con amount < 0 y fecha ≤ último día de M      (gasto sin categorizar reduce RTA)

RTA(M) = I(M) − A(M) − CO(M) − U(M)

rta_disponible_hoy = RTA(mes actual) − Σ_{t > mes actual} Σ_c assigned(c,t)   -- lo asignado a meses futuros ya no está libre
```

Reglas derivadas:
- **Sobregasto en efectivo** del mes M **no** cambia RTA(M); reduce RTA(M+1) (🟦 documentado en spec 05 existente).
- **Sobregasto con tarjeta** no cambia RTA; su costo aparece cuando el usuario **asigna** al Pago de tarjeta (sube `A`).
- Ingreso **sin categoría** (entrada) no suma a `I` hasta categorizarse (conservador).
- RTA rojo (< 0) ⇒ "Asignaste Bs X de más".

### A5.5 Identidad de verificación (se usa en tests de integración; **debe** cumplirse)

```text
Para presupuestos sin transacciones sin categoría de entrada y sin reembolsos de tarjeta entre meses:

RTA(M) = CashOnBudget(≤ fin M) − Σ_c max(0, end(c,M)) + Σ_c cash_overspent(c,M)

donde CashOnBudget = suma de saldos de cuentas on-budget que NO son CREDIT_CARD (todas las líneas con fecha ≤ fin de M,
incluidos saldos iniciales y transferencias) y c recorre TODAS las categorías (incluye Pago de tarjeta y ocultas).
```

Un test property-based genera secuencias aleatorias de eventos y afirma A5.4 == A5.5 en cada paso.

## A6. Catálogo de errores de dominio (plan §143–144)

Todos los comandos devuelven `Result<T, DomainError>` con `code`, `message_es`, `details`. HTTP solo en route handlers.

| Código | HTTP | Mensaje ES (base) | Cuándo |
|---|---:|---|---|
| `VALIDATION_FAILED` | 400 | "Revisa los campos marcados." | Zod falla |
| `UNAUTHENTICATED` | 401 | "Inicia sesión para continuar." | Sin sesión |
| `PERMISSION_DENIED` | 403 | "No tienes permiso para hacer esto en este presupuesto." | Rol insuficiente |
| `NOT_FOUND` | 404 | "No encontramos lo que buscas." | Recurso ajeno u inexistente (no revelar existencia) |
| `CONFLICT_VERSION` | 409 | "Este dato cambió desde otro dispositivo. Actualizamos la vista." | `version` desfasada |
| `RATE_LIMITED` | 429 | "Demasiados intentos. Prueba en unos minutos." | Límite superado |
| `AMOUNT_ZERO` | 422 | "El monto no puede ser cero." | Transacción/split en 0 |
| `AMOUNT_OVERFLOW` | 422 | "El monto es demasiado grande." | > límite de `BIGINT` seguro |
| `INVALID_SPLIT` | 422 | "La distribución suma {sum} pero la compra es {total}. Faltan {diff}." | I1 |
| `TRANSFER_SAME_ACCOUNT` | 422 | "Elige cuentas distintas." | origen = destino |
| `TRANSFER_CURRENCY_MISMATCH` | 422 | "Las cuentas usan monedas distintas." | Fase 1 |
| `TRANSFER_CLOSED_ACCOUNT` | 422 | "La cuenta destino está cerrada." | |
| `CC_TO_CC_UNSUPPORTED` | 422 | "Transferir entre tarjetas aún no está disponible." | ADR-G4 |
| `ACCOUNT_CLOSED` | 422 | "Esta cuenta está cerrada." | Movimiento en cuenta cerrada |
| `ACCOUNT_NOT_ZERO_BALANCE` | 422 | "Para cerrar la cuenta su saldo debe ser 0." | Cierre |
| `ACCOUNT_HAS_ACTIVE_SCHEDULES` | 422 | "Hay transacciones programadas en esta cuenta." | Cierre |
| `CATEGORY_SYSTEM_PROTECTED` | 422 | "Esta categoría es del sistema y no se puede modificar." | Ingreso/Pago de tarjeta |
| `CATEGORY_NOT_EMPTY` | 422 | "Esta categoría tiene movimientos. Elige a cuál moverlos." | Eliminar |
| `CATEGORY_DUPLICATE_NAME` | 409 | "Ya existe una categoría con ese nombre en este grupo." | |
| `TRANSACTION_RECONCILED_LOCKED` | 423 | "Esta transacción está conciliada 🔒. Desbloquéala para editarla." | Editar monto/fecha/cuenta |
| `TRANSACTION_VOIDED` | 422 | "Esta transacción está anulada." | Editar anulada |
| `DUPLICATE_TRANSACTION` | 409 | "Parece un duplicado de otra transacción." | Import/regla |
| `MONTH_OUT_OF_RANGE` | 422 | "Ese mes está fuera del rango permitido." | |
| `ASSIGN_EXCEEDS_AVAILABLE` | 422 | "No hay suficiente dinero por asignar." | Solo si `strict_budgeting` |
| `MOVE_SAME_CATEGORY` | 422 | "Elige una categoría distinta." | |
| `GOAL_INVALID` | 422 | "La meta no es válida: {razón}." | Spec 06 |
| `GOAL_UNSUPPORTED_CATEGORY` | 422 | "Esta categoría no admite metas." | Pago de tarjeta/sistema |
| `RECONCILIATION_MISMATCH` | 422 | "El saldo confirmado no coincide. Diferencia: {diff}." | Spec 08 |
| `IMPORT_FILE_TOO_LARGE` | 413 | "El archivo supera {max}." | |
| `IMPORT_UNSUPPORTED_FORMAT` | 415 | "Formato no compatible. Usa CSV, OFX o QFX." | |
| `IMPORT_MAPPING_INVALID` | 422 | "Falta mapear la columna {col}." | |
| `IMPORT_BATCH_ALREADY_APPLIED` | 409 | "Esta importación ya se aplicó." | Idempotencia |
| `SCHEDULE_INVALID_RULE` | 422 | "La frecuencia no es válida." | Spec 10 |
| `INVITE_EXPIRED` | 410 | "La invitación venció. Pide otra." | Spec 12 |
| `INVITE_EMAIL_MISMATCH` | 403 | "Esta invitación es para otro correo." | |
| `INVITE_ALREADY_MEMBER` | 409 | "Ya eres miembro de este presupuesto." | |
| `LAST_OWNER_CANNOT_LEAVE` | 422 | "Transfiere la propiedad antes de salir." | |
| `EMAIL_NOT_VERIFIED` | 403 | "Verifica tu correo para continuar." | Crear presupuesto |
| `INVALID_CREDENTIALS` | 401 | "Correo o contraseña incorrectos." | Login (genérico) |
| `WEAK_PASSWORD` | 422 | "La contraseña es muy débil." | Registro |

**Regla UX (plan §144):** todo error muestra *qué pasó, por qué, cuánto falta y un botón "Corregir"*, nunca "Error 400".

### A6.1 Códigos añadidos por la Parte B y equivalencias con el plan profundo

| Código | HTTP | Mensaje ES (base) | Cuándo |
|---|---:|---|---|
| `MOVE_INSUFFICIENT_AVAILABLE` | 422 | "Esa categoría solo tiene {available} disponible." | Mover dinero sin saldo (salvo `override`) — Spec 05 |
| `AUTO_ASSIGN_PREVIEW_STALE` | 409 | "El plan cambió desde la vista previa. Recalculamos la propuesta." | `previewHash` no coincide — Spec 05 |
| `GOAL_SNOOZED` | 422 | "Esta meta está pospuesta este mes." | Operar sobre meta en snooze (informativo) — Spec 06 |
| `RECONCILIATION_OPEN_EXISTS` | 409 | "Ya hay una conciliación en curso para esta cuenta." | Spec 08 |
| `IMPORT_ROW_INVALID` | 422 | "La fila {n} no se pudo leer: {razón}." | Spec 09 |
| `INVITE_REVOKED` | 410 | "Esta invitación fue cancelada." | Spec 12 |
| `MEMBER_ROLE_FORBIDDEN` | 403 | "No puedes asignar o quitar ese rol." | Spec 12 |

**Advertencias (no son errores; viajan en `warnings[]` del snapshot):** `FUTURE_NEGATIVE_ASSIGNED`, `CC_FLOAT_RISK`, `CC_POSITIVE_BALANCE`, `CC_PAYMENT_UNDERFUNDED`, `RTA_NEGATIVE`, `GOAL_OFF_PACE`.

**Equivalencias (nombres del plan profundo → código canónico de este documento):**

| Nombre en el plan profundo | Código canónico |
|---|---|
| `BUDGET_NOT_FOUND`, `BUDGET_ACCESS_DENIED` | `NOT_FOUND` / `PERMISSION_DENIED` (no revelar existencia) |
| `RTA_INSUFFICIENT` | `ASSIGN_EXCEEDS_AVAILABLE` (solo con `strict_budgeting`, ADR-G12) |
| `INVALID_SPLIT_TOTAL` | `INVALID_SPLIT` |
| `INVALID_TRANSFER`, `INVALID_TRANSFER_SAME_ACCOUNT` | `TRANSFER_SAME_ACCOUNT`, `TRANSFER_CURRENCY_MISMATCH`, `TRANSFER_CLOSED_ACCOUNT` |
| `CURRENCY_MISMATCH` | `TRANSFER_CURRENCY_MISMATCH` / `ACCOUNT_CURRENCY_MISMATCH` (trigger) |
| `DUPLICATE_IMPORT` | `IMPORT_BATCH_ALREADY_APPLIED` / `DUPLICATE_TRANSACTION` |
| `TARGET_INVALID` | `GOAL_INVALID` |
| `SCHEDULE_DUPLICATE` | no es error: la idempotencia (`UNIQUE(scheduled_id, occurrence_date)`) devuelve el resultado existente |
| `RECONCILED_TRANSACTION_PROTECTED` | `TRANSACTION_RECONCILED_LOCKED` |

**Mensajes de error con contexto (ejemplos obligatorios de estilo):**
> *No se pudo guardar.* La división de la compra suma Bs 145, pero la compra es de Bs 150. **Faltan Bs 5.**
> *No se pudo asignar.* Intentas asignar Bs 700, pero solo hay Bs 520 por asignar.

## A7. Auditoría (base común; UI en Spec 12)

```sql
create table audit_events (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid,                         -- null para eventos de cuenta de usuario
  actor_user_id uuid,                     -- null si source = system/scheduled
  entity_type text not null,              -- 'transaction','category_month','account','goal',...
  entity_id uuid,
  action text not null,                   -- 'created','updated','voided','assigned','moved','reconciled',...
  before jsonb, after jsonb,
  source text not null check (source in ('ui','api','import','scheduled','ai','system')),
  request_id text,
  device_id uuid,
  engine_version text,                    -- versión del motor de cálculo al momento del evento (A13.5)
  ip_hash text,                           -- hash con sal rotada; nunca IP en claro
  created_at timestamptz not null default now()
);
create index on audit_events (budget_id, created_at desc);
create index on audit_events (entity_type, entity_id, created_at desc);
-- Append-only: REVOKE UPDATE, DELETE ON audit_events FROM app_role;  (solo INSERT/SELECT)
```

Reglas:
- **Todo comando que muta datos financieros escribe ≥ 1 evento en la misma transacción de BD.**
- `before`/`after` guardan solo campos cambiados y **nunca** secretos, tokens ni payloads bancarios crudos.
- Catálogo mínimo de `action` por entidad se define en cada spec (sección "Auditoría").
- Lectura: `OWNER`/`ADMIN` ven todo; `EDITOR` ve el feed de actividad del presupuesto; `VIEWER` no ve auditoría.

## A8. Convenciones de backend (Next.js + Supabase + Drizzle)

### A8.1 Capas por módulo (plan §93)

```text
packages/<módulo>/domain          funciones puras y tipos (sin I/O)
apps/web/src/server/<módulo>/
   application/                   comandos y queries (orquestan repos + dominio)
   infrastructure/                repositorios Drizzle, SQL, adaptadores
apps/web/src/app/                 rutas, server actions, UI
```

### A8.2 Anatomía obligatoria de un comando

```ts
// application/createTransaction.ts  (patrón; la IA debe respetarlo en TODOS los comandos)
export async function createTransaction(ctx: Ctx, input: unknown): Promise<Result<TxDTO, DomainError>> {
  const parsed = CreateTransactionInput.safeParse(input);            // 1. Zod
  if (!parsed.success) return err('VALIDATION_FAILED', parsed.error);
  const member = await requireMember(ctx, parsed.data.budgetId, 'EDITOR'); // 2. AuthZ (rol mínimo)
  return ctx.db.transaction(async (tx) => {                           // 3. UNA transacción de BD
    /* 4. cargar agregados con FOR UPDATE si hay riesgo de carrera        */
    /* 5. reglas de dominio (funciones puras) → error o cambios           */
    /* 6. persistir (repos)                                               */
    /* 7. audit_events + domain event interno                             */
    return ok(dto);                                                       // 8. DTO serializable (sin bigint crudo)
  });
}
```

- **Queries** (`getBudgetOverview`, `getAccountRegister`…) **nunca** mutan (plan §75).
- **DTO de dinero al cliente:** `{ minor: string, currency: 'BOB' }` (string para no perder precisión con bigint). El cliente usa `formatMoney`.
- **Server Actions** para formularios de UI; **Route Handlers** `/api/v1/...` para clientes externos/PWA offline. Ambos llaman a la **misma** capa `application`.
- **Revalidación:** tras un comando, `revalidateTag('budget:{id}')`. El cliente (TanStack Query) invalida `['budget', id, …]`. **Cache nunca es fuente de verdad** (plan §95).
- **Realtime:** canal `budget:{id}` de Supabase Realtime emite `{type:'invalidate', scopes:[…]}`; el cliente refetchea (no aplica diffs manuales).
- **Rate limiting:** login/registro/reset/invitar/importar (tabla `rate_limits` o Upstash); ver cada spec.
- **Logging (plan §97):** `request_id, user_id, budget_id, feature, duration_ms, result, error_code`. Prohibido loguear contraseñas, tokens, montos crudos de payloads bancarios.

### A8.3 Plantilla de RLS (se repite en todas las tablas con `budget_id`)

```sql
-- helper (SECURITY DEFINER, estable, sin exponer datos)
create or replace function is_budget_member(_budget uuid, _min text default 'VIEWER')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from budget_members m
    where m.budget_id = _budget and m.user_id = auth.uid()
      and array_position(array['VIEWER','EDITOR','ADMIN','OWNER'], m.role)
        >= array_position(array['VIEWER','EDITOR','ADMIN','OWNER'], _min)
  );
$$;

alter table <tabla> enable row level security;
create policy "<tabla>_select" on <tabla> for select using (is_budget_member(budget_id, 'VIEWER'));
create policy "<tabla>_insert" on <tabla> for insert with check (is_budget_member(budget_id, 'EDITOR'));
create policy "<tabla>_update" on <tabla> for update using (is_budget_member(budget_id,'EDITOR')) with check (is_budget_member(budget_id,'EDITOR'));
-- DELETE: sin política (denegado) en tablas financieras
```

Excepciones (ADMIN+): `category_groups`/`categories`/`goals` escritura = `EDITOR` (ver matriz Spec 12), `budget_members`/`budget_invitations`/`budgets` = `ADMIN`/`OWNER`.
Test obligatorio por tabla: *usuario B no ve ni modifica filas de usuario A* (Vitest + cliente Supabase con JWT distinto).

## A9. Convenciones de UI transversales

### A9.1 Shell de aplicación (Action-First, plan §55–58, 104)

```text
DESKTOP (≥1024px)
┌────────────┬──────────────────────────────────────────────┬───────────────┐
│ Sidebar    │ Barra superior: [Mes ◀ Sep 2026 ▶] [Por asignar Bs 720] [🔍 Ctrl+K] [+ N]│ Inspector │
│ Inicio     │──────────────────────────────────────────────│ (panel derecho│
│ Presupuesto│                Contenido de la ruta          │  contextual;  │
│ Reportes   │                                              │  Nivel 2/3)   │
│ ────────── │                                              │               │
│ CUENTAS    │                                              │               │
│  Presup.   │                                              │               │
│  Seguim.   │                                              │               │
│  Cerradas  │                                              │               │
└────────────┴──────────────────────────────────────────────┴───────────────┘

MÓVIL (<768px)  Barra inferior: Inicio · Presupuesto · [＋] · Cuentas · Más     Detalle = bottom sheet
```

### A9.2 Rutas (App Router)

```text
/login  /register  /forgot-password  /reset-password  /verify-email  /auth/callback  /onboarding
/invite/[token]
/b                          → redirige al último presupuesto o a "crear presupuesto"
/b/new
/b/[budgetId]               → Inicio (dashboard action-first)
/b/[budgetId]/budget?m=2026-09
/b/[budgetId]/accounts/[accountId]
/b/[budgetId]/accounts/all
/b/[budgetId]/scheduled
/b/[budgetId]/reports/[net-worth|income-expense|spending|trends|age-of-money]
/b/[budgetId]/settings/[general|categories|members|payees|import|activity]
/settings/[profile|security|privacy]
```

Regla: el `budgetId` viene de la URL; **toda** query lo recibe explícito y lo verifica contra la membresía (nunca de una variable global).

### A9.3 Estados obligatorios de cada pantalla

Cada pantalla define y prueba: **cargando** (skeleton, sin saltos de layout), **vacío** (ilustración simple + acción principal), **error** (mensaje A6 + reintentar), **sin permiso** (rol VIEWER: controles de edición ocultos/deshabilitados con tooltip), **offline** (banner, lectura de caché local; escritura → cola en Spec 23).

### A9.4 Componentes base (en `packages/ui`, con tokens únicos P13)

`GlassCard`, `Sheet` (drawer/bottom sheet con focus-trap), `Modal`, `MoneyText`, `CalcInput` (P14, todo monto), `NumericInput` (tasas/porcentajes), `StatusChip`, `EmptyState`, `Skeleton`, `Toast`/`UndoToast`, `ConfirmDialog` (acciones destructivas: escribir el nombre), `Combobox` (payee/categoría con búsqueda y teclado), `MonthPicker`, `DataTable virtualizada`, `KeyboardHint`.

### A9.5 Atajos de teclado (web; se listan en `?`)

| Atajo | Acción |
|---|---|
| `N` | Nueva transacción (abre Sheet) |
| `Ctrl/⌘+K` | Buscador / paleta de comandos |
| `[` `]` | Mes anterior / siguiente (pantalla Presupuesto) |
| `↑ ↓ ← →` | Navegar celdas de la grilla / registro |
| `Enter` | Editar celda / guardar |
| `Esc` | Cancelar / cerrar (vuelve un nivel de profundidad) |
| `Ctrl/⌘+Z` · `Ctrl/⌘+Shift+Z` | Deshacer / rehacer (ver A9.6) |
| `A` | Aprobar transacción(es) seleccionada(s) |
| `C` | Alternar Confirmada/Pendiente |
| `M` | Mover dinero (categoría seleccionada) |
| `Del` | Anular (con confirmación deshacible) |

### A9.6 Deshacer / Rehacer 🟦🟩

YNAB ofrece deshacer/rehacer en su web. En Bolsilludo: **cada comando devuelve un `UndoDescriptor`** (comando compensatorio serializable + `expires_at`). `UndoToast` (8 s) y `Ctrl+Z` lo ejecutan. Los compensatorios **no editan historia**: crean nuevos eventos (anular, re-asignar) y quedan en auditoría. Pila de 20 acciones por sesión. Acciones no deshacibles (p. ej. conciliar tras 10 min, importar aplicado con transacciones ya conciliadas) lo indican en el toast.

### A9.7 Copys, tono y accesibilidad

- Español neutro-boliviano, segunda persona ("tú"), frases cortas, sin jerga contable ("Por asignar", no "RTA"). Términos avanzados solo en **Modo avanzado** (plan §107–108).
- WCAG 2.2 AA: foco visible, orden lógico, `aria-live="polite"` para montos calculados y toasts, etiquetas asociadas, objetivos táctiles ≥ 44 px, sin depender solo del color, `prefers-reduced-motion`, `prefers-contrast`, `prefers-reduced-transparency`.
- Tokens: solo `var(--…)` (P13). Liquid Glass en tarjetas de Inicio, sheets y notificaciones; **opaco** en grilla/registro/Nivel 4 (58A.1).

## A9.8 Principios de interfaz adicionales (plan profundo §127–138, 166)

- **El Inicio no es una hoja de cálculo.** Orden canónico: 1 Por asignar · 2 Centro de atención · 3 Acciones rápidas · 4 Salud del mes · 5 Metas · 6 Cuentas · 7 Movimientos recientes · 8 Insights.
- **Tablas solo donde ayudan:** registro de transacciones, conciliación, auditoría y gestión masiva. Nunca como primera experiencia.
- **Divulgación progresiva** (modo simple/avanzado). Simple: `Comida · 420 disponible · 180 necesarios`. Avanzado: `Asignado 600 · Actividad −180 · Disponible 420 · Sobregasto efectivo 0 · Sobregasto tarjeta 0 · Meta requerida 180`.
- **Explicadores "¿Por qué este valor?"** en toda cifra compleja. Los produce el **dominio** como `explanation: {label, amount}[]` en el DTO (la UI solo los pinta). Ejemplo: *"¿Por qué mi pago de tarjeta está en falta? Deuda: 850 · Reservado para pagar: 600 · Falta: 250."*
- **Valores por defecto inteligentes** (comercio → categoría sugerida, con confianza y motivo). La sugerencia **nunca** altera una regla explícita del usuario.
- **Paridad web/móvil sin layout idéntico:** web optimiza planificación, edición masiva, conciliación y reportes; móvil optimiza captura rápida, revisión, alertas y metas.
- **Búsqueda global `Ctrl/⌘+K`:** busca transacciones, cuentas, categorías, comercios y metas; ejecuta acciones (nueva transacción, asignar, transferir, conciliar).
- **Acciones rápidas (botón `+`):** Transacción · Transferencia · Asignar · Meta · Escanear recibo (tras OCR, Parte C) · Conciliar.

## A9.9 Profundidad y Liquid Glass

| Nivel | Uso | Superficie |
|---|---|---|
| L0 | fondo | — |
| L1 | página | opaca |
| L2 | tarjeta | vidrio permitido |
| L3 | drawer / modal / sheet | vidrio permitido |
| L4 | confirmación / auditoría | **opaca** |

- La profundidad comunica **jerarquía**, no decoración 3D (equivale a los Niveles 1–4 del plan §58A).
- **Sí** vidrio: captura rápida, paleta de comandos, tarjetas de metas, tarjetas de atención informativas, resumen de cuentas, modal/drawer. **No** vidrio: registros densos, formularios largos, tablas financieras y **avisos críticos**.
- Controles de accesibilidad: `reduce_motion`, `high_contrast`, `disable_blur`, claro/oscuro (respetan `prefers-*`). Ningún estado se comunica **solo** por blur/transparencia.

## A10. Convenciones de pruebas

| Nivel | Herramienta | Alcance mínimo |
|---|---|---|
| Unit | Vitest | Toda función pura de dominio, tabla de casos (entradas → salidas exactas) |
| Property | fast-check | Invariantes I1–I7, A5.5, conservación de dinero |
| Integración | Vitest + Postgres real (testcontainers / Supabase local) | Comandos, RLS, constraints, migraciones en limpio |
| Contrato | Zod schemas compartidos | Entrada/salida de server actions y `/api/v1` |
| E2E | Playwright | Journeys 1–4 del plan §81 y los de cada spec |
| A11y | axe + Playwright | Sin violaciones AA en pantallas clave |

**Dataset dorado (Parte N):** todo motor debe reproducir *exactamente* los escenarios GS-xx. Se guardan como JSON en `tests/golden/*.json` y los usan unit, integración y E2E.

**Semillas y reloj:** los tests inyectan un `Clock` (fecha fija) y semilla aleatoria fija en fast-check; `todayInBudgetTz` recibe el reloj por parámetro.

### A10.1 Pirámide y property tests obligatorios (plan profundo §170–174)

```text
Property tests → Unit → Integración → E2E      (la mayor cantidad de pruebas vive en budget-engine, credit-card-engine y transaction-engine)
```

| Property | Enunciado |
|---|---|
| Split | Para todo split válido: `Σ hijos = padre`; para inválidos el validador falla. |
| Transferencia | Misma moneda: `origen + destino = 0` y `|origen| = |destino|`. |
| RTA al mover | Tras mover dinero entre categorías: `RTA_antes = RTA_después`. |
| RTA al asignar | Tras asignar `X`: `RTA_después = RTA_antes − X` (salvo un `UNASSIGN`/ajuste contrario explícito). |
| Identidad A5.4 = A5.5 | En cada paso de una secuencia aleatoria de eventos. |
| Reparto | `distribute(total, n)` conserva el total y las líneas difieren ≤ 1 unidad. |

Pruebas de bug obligatorias (además del catálogo A11): **doble cron** (procesar programadas dos veces ⇒ exactamente 1 transacción) · **doble importación** (mismo archivo dos veces ⇒ sin duplicados) · **dos dispositivos** (ver GS-12) · **editar conciliada** (bloqueado) · **split parcial** (ni transacción ni splits cambian).

## A11. Catálogo de bugs típicos de una IA en este dominio (y cómo se previenen)

> Objetivo: convertir "surgía un bug cada momento" en una lista finita con antídoto. La IA debe revisarla antes de cada PR.

| # | Bug típico | Causa habitual | Prevención en este documento |
|---|---|---|---|
| 1 | Céntimos perdidos, totales que no cuadran | `float`/`toFixed` | A2, P2, property tests del parser |
| 2 | Gasto aparece en el mes equivocado | `timestamptz`/zona horaria | A3 (`DATE`), `monthOf` único |
| 3 | RTA distinto en cada pantalla | Cada vista recalcula | A5, función única + test A5.4==A5.5 |
| 4 | Disponible doble contado con tarjeta | Contar la línea de tarjeta y además el pago | A5.2/A5.3, 07.4 |
| 5 | Sobregasto "desaparece" o se arrastra negativo | Rollover ingenuo | `start = max(0, end)`, A5.4 `CO(M)` |
| 6 | Transferencia queda a medias | Dos inserts sin transacción | 04.6 comando atómico + `transfer_group_id` NOT NULL par |
| 7 | Split ≠ total al editar monto del padre | Validar solo en creación | 04.4 BR-TRX-040, trigger diferido en BD |
| 8 | Saldo de cuenta desactualizado | Columna `current_balance` mutable | 03.5: **vista** derivada, no columna |
| 9 | Usuario ve datos de otro presupuesto | Falta RLS o filtro | A8.3, FK compuestas A4, tests RLS |
| 10 | Doble posteo de programadas | Job reintentado | 10.5 `UNIQUE(scheduled_id, occurrence_date)` |
| 11 | Recurrencia mensual deriva (31→28→28) | Sumar al resultado anterior | 10.4 ancla |
| 12 | Duplicados al reimportar el mismo archivo | Sin huella/orden | 09.4 fingerprint + ocurrencia |
| 13 | Editar una transacción conciliada rompe la conciliación | Sin bloqueo | 08.4 BR-REC-010..013 |
| 14 | UI optimista muestra un estado que el servidor rechaza | Actualización local divergente | Optimismo solo para acciones triviales; el servidor devuelve estado canónico y la UI lo reemplaza |
| 15 | Carrera al asignar desde dos dispositivos | Sin versión | A4 `version`, 409 |
| 16 | Categoría borrada deja transacciones huérfanas | `ON DELETE CASCADE` | 02.4 BR-CAT-020 (mover antes de archivar) |
| 17 | Cuenta cerrada sigue afectando RTA | No excluir | 03.4 BR-ACC-030 |
| 18 | Reembolso suma a ingresos | Tratarlo como inflow RTA | 04.4 BR-TRX-070 |
| 19 | Pago de tarjeta cuenta como gasto en reportes | No excluir transferencias | 11.4 BR-RPT-010 |
| 20 | Comparaciones de dinero de monedas distintas | Sumar USD+BOB | I7; CHECK `currency = budget.currency` en Fase 1 |
| 21 | Mensaje "Error 400" | Sin catálogo | A6 |
| 22 | Cálculo con `eval` en CalcInput | Atajo inseguro | 58B.3 parser propio |
| 23 | Foco perdido al cerrar Sheet | Sin focus-trap/retorno | A9.4, tests E2E de teclado |
| 24 | El agente IA aplica cambios sin aprobación | Sin estado PROPOSED | P7/P15; todo cambio pasa por comando con `source='ai'` tras aprobación |
| 25 | Texto de un CSV/memo se interpreta como instrucción | Prompt injection | 09.9 (dato ≠ instrucción), lista blanca de herramientas |
| 26 | Exportar CSV permite inyección de fórmulas | Celdas que empiezan con `=+-@` | 11.6 prefijo `'` |
| 27 | Migración editada tras aplicada | Reescribir historia | §101: nueva migración siempre |
| 28 | Tests dependen de "hoy" | `new Date()` | A10 `Clock` inyectado |
| 29 | Contraseña >72 bytes se trunca silenciosamente | bcrypt | 01.4 BR-IDN-003 |
| 30 | Enumeración de usuarios en login/reset | Mensajes distintos | 01.4 BR-IDN-010 |
| 31 | Un pendiente bancario mueve el presupuesto | Tratar `pending` como posted | 09.4 BR-IMP-020 (`PENDING_EXTERNAL` vive en staging) |
| 32 | Auto-fusión de un emparejamiento ambiguo | Umbral único | 09.4 BR-IMP-031 (0,60–0,89 ⇒ revisión manual) |
| 33 | Meta semanal asume 4 semanas por mes | Cálculo fijo | 06.4 BR-GOL-030 (ocurrencias reales) |
| 34 | Disponible doble contado (`previous_available + rollover`) | Sumar dos veces el mismo dinero | 05.4 BR-ENG-010 |
| 35 | La IA pisa una regla explícita del usuario | Orden de decisión mal definido | Parte C (usuario > historial > clasificador > IA) |
| 36 | Auto-Assign se ejecuta al tocar la estrategia | Sin vista previa | 05.4 BR-ENG-060 (preview → confirmar → persistir) |
| 37 | Pago de tarjeta registrado como categoría de gasto | Ignorar el vínculo cuenta↔categoría | 07.4 BR-CC-001, BR-TRX-012 |

### A11.1 Priorización de bugs

| Prioridad | Ejemplos |
|---|---|
| **P0** (bloquea release) | dinero duplicado · dinero perdido · RTA incorrecto · pago de tarjeta incorrecto · transferencia desbalanceada · conciliación corrupta |
| **P1** | meta incorrecta · reporte incorrecto · importación incorrecta |
| **P2** | visual · copy · animación |

### A11.2 Orden de investigación de un bug financiero

```text
1 Reproducir → 2 Inspeccionar estado de BD → 3 Inspeccionar entrada del dominio → 4 Inspeccionar salida del dominio →
5 Ejecutar invariantes → 6 Inspeccionar respuesta de API → 7 Inspeccionar caché → 8 Inspeccionar UI
```
**No se empieza editando React.** Preguntas guía: ¿qué estado financiero *debería* existir y cuál existe? ¿qué operación provocó la primera divergencia? ¿qué invariante se rompió? ¿hay más de una fuente de verdad? ¿puede competir bajo concurrencia? ¿podría ejecutarse dos veces? ¿qué prueba de regresión falta?

### A11.3 Qué registrar cuando el dinero está mal

`budget_id · month · saldos de cuentas · ids de transacciones · ids de eventos de asignación · RTA antes/después · disponible por categoría antes/después · versión del motor · request_id`. **Nunca** datos secretos.

---

## A12. Principios de dominio (plan profundo §1–4, 231)

### A12.1 Tres conceptos que nunca se mezclan

| Concepto | Qué representa | Contiene | ¿Editable? |
|---|---|---|---|
| **Ledger real** | Lo que ocurrió con el dinero | cuentas, transacciones, transferencias, datos externos del banco | Sí (con reglas de ciclo de vida) |
| **Plan** | La intención | asignaciones por categoría, metas, transacciones programadas | Sí |
| **Estado derivado** | Lo que resulta | Por asignar, Disponible, Falta asignar, Sobregasto, Pago de tarjeta disponible, progreso de metas, reportes | **Nunca** se edita directamente |

### A12.2 Identidad del dinero
Todo movimiento responde: ¿dónde está? (cuenta) · ¿para qué sirve? (categoría) · ¿cuándo ocurrió? (fecha) · ¿cuánto? (monto) · ¿en qué moneda? · ¿está confirmado? (estado) · ¿fue conciliado? No se mezclan: saldo de cuenta, disponible de categoría, Por asignar y pago disponible de tarjeta.

### A12.3 Flujo base

```text
CUENTA → INGRESO / SALDO INICIAL → POR ASIGNAR → ASIGNACIÓN A CATEGORÍA → DISPONIBLE → TRANSACCIÓN → ACTIVIDAD / CAMBIO DE SALDOS
```
Una transferencia entre cuentas on-budget **no crea dinero**. Una compra con tarjeta **no crea Por asignar**. Mover dinero entre categorías **no crea dinero**.

### A12.3b Regla innegociable
`UNA DEFINICIÓN · UN MOTOR · MUCHAS PRESENTACIONES` (regla de oro 11).

## A13. Infraestructura transversal adicional (plan profundo §118–126, 218–224, 234–235)

### A13.1 Atomicidad, sin escrituras parciales y outbox
- Todo movimiento compuesto es **ACID** (transferencia, split, importación, asignación/movimiento). Nunca "origen creado pero destino falló".
- **No se hacen llamadas de red dentro de una transacción financiera.** Patrón *outbox*: `mutación + fila outbox → COMMIT → worker → notificación/webhook/job`. Si falla la notificación, la mutación financiera **permanece** y el outbox reintenta.

```sql
create table outbox_events (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid, type text not null, payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','processing','done','failed')),
  retry_count int not null default 0, next_retry_at timestamptz, last_error text,
  created_at timestamptz not null default now(), processed_at timestamptz
);
```

### A13.2 Jobs (Fase 1)
Programadas · sincronización bancaria · importaciones · refresco de reportes · notificaciones · eliminaciones de cuenta/presupuesto. Cada job tiene `status`, `retry_count`, `next_retry_at`, `last_error` y es **idempotente**.

### A13.3 Caché e invalidación
La caché **nunca** es fuente de verdad para Por asignar, Disponible, pago de tarjeta ni saldos. Tras mutar una transacción se invalida solo lo necesario: registro de la cuenta, snapshot del presupuesto, categoría-mes, metas y reportes (complementa 04.6.3).

### A13.4 Objetivos de rendimiento (internos, no son garantías)
Respuesta local de captura rápida < 300 ms · cálculo de snapshot típico < 200 ms · carga percibida del Inicio < 1,5 s · búsqueda típica < 300 ms.

### A13.5 Versionado del motor de cálculo
Se guarda `calculation_engine_version` (semver, p. ej. `v1.0.0`) en `audit_events.engine_version` y en cada snapshot. Permite explicar diferencias tras cambiar el algoritmo.

### A13.6 Migraciones
Las migraciones ya aplicadas **no se editan** (regla §101). Nombres ordenados: `001_initial`, `002_budget_events`, `003_goal_engine_v2`, `004_credit_card_payment_links`…

### A13.7 Seguridad y minimización de datos
- Nunca loguear: contraseñas, tokens de acceso, credenciales bancarias, número completo de tarjeta (PAN).
- Autorización en **tres capas**: RLS + autorización de servidor + autorización de dominio.
- No almacenar usuario/contraseña bancaria si el proveedor soporta OAuth/token; guardar referencias/secretos del proveedor en almacenamiento seguro.
- IA: enviar al LLM solo datos **agregados y relevantes** a la pregunta (no todas las cuentas ni todo el historial salvo necesidad y permiso).


---
