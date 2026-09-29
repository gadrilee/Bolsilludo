# SPEC 04 — TRANSACTIONS (LEDGER, SPLITS, TRANSFERS, PAYEES)

**Dependencias:** 02, 03. **Hito:** M1. **Prefijos:** `FR-TRX`, `BR-TRX`, `FR-PAY`, `BR-PAY`.
Es el spec con más riesgo de bugs: define el **ledger**. Todas las fórmulas de la Parte A dependen de que estas reglas sean exactas.

## 04.1 Cómo funciona YNAB (🟦)

- El **registro** (register) de cada cuenta lista transacciones con: fecha, comercio (payee), categoría, nota (memo), salida (outflow), entrada (inflow), estado **cleared** (C gris = pendiente, C verde = confirmada, candado = conciliada), **marca de color** (flag) y, en cuentas vinculadas/importadas, estado **aprobada/sin aprobar** (punto azul).
- Al escribir un comercio conocido, YNAB **autocompleta la última categoría usada** con ese comercio.
- **Transferencias:** se eligen como comercio especial "Transfer : {cuenta}". Entre cuentas **de presupuesto** no llevan categoría (no cambian Ready to Assign). Entre una cuenta de presupuesto y una de **seguimiento** sí requieren categoría (es un gasto o un ingreso para el plan).
- **Ingresos** se categorizan como **"Inflow: Ready to Assign"**; los reembolsos de una compra se categorizan en la **misma categoría del gasto** (devuelven el dinero a esa categoría).
- **Split:** una transacción se divide en varias categorías (cada una con su nota). La suma de las partes debe igualar el total.
- **Acciones masivas:** seleccionar varias → categorizar, cambiar comercio/fecha/nota/marca, marcar confirmadas, aprobar, eliminar. **Duplicar**, **mover a otra cuenta**, buscar/filtrar (fecha, comercio, categoría, nota, monto, marca, estado), **deshacer/rehacer**.
- Las transacciones sin categoría quedan marcadas ("Needs a category").
- Editar una transacción **conciliada** exige confirmar una advertencia.
- Con efectivo: retirar es una **transferencia** cuenta → cuenta de efectivo; el efectivo recibido es un ingreso.

## 04.2 Qué hará Bolsilludo

| Capacidad | Tipo |
|---|---|
| Registro por cuenta y "Todas las cuentas" con búsqueda, filtros, orden y virtualización | 🟦 paridad |
| Estados `PENDING/CLEARED/RECONCILED/VOIDED` + `is_approved` + `flag_color` | 🟦 paridad (plan §16) |
| Ingreso / Gasto / Transferencia / Reembolso / Split | 🟦 paridad |
| Autocompletar categoría por comercio (último uso **y** más frecuente) | 🟦 + 🟩 |
| **Captura en < 10 s** (Sheet: monto primero con `CalcInput`; categoría y cuenta prellenadas) | 🟩 mejora (P11) |
| Edición masiva, duplicar, mover de cuenta, deshacer/rehacer (A9.6) | 🟦 paridad |
| "Anular" en vez de "Eliminar" (historial inmutable, P3) con deshacer | 🟩 mejora |
| Comercios: normalización, renombrar, **fusionar**, sugerencias | 🟦 + 🟩 |
| Bloqueo suave de conciliadas (ADR-G7): edición solo tras "Desbloquear" auditado | 🟦 + 🟨 |
| Explicación en línea del efecto de cada transacción ("Esto resta Bs 50 de *Comida*") | 🟩 mejora |
| 🟨 **Traspasos sin fila de `payees`** (ADR-G18); saldo inicial/ajustes tampoco (`kind`) | Decisión |
| 🟨 Monto `0` **rechazado** (`AMOUNT_ZERO`) salvo líneas de split que se rechazan igual | Decisión |

## 04.3 Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-TRX-001 | `EDITOR+` puede crear ingreso, gasto y transferencia en cuentas abiertas. |
| FR-TRX-002 | `EDITOR+` puede editar campos de una transacción respetando el bloqueo de conciliadas. |
| FR-TRX-003 | `EDITOR+` puede anular y restaurar transacciones (deshacer). |
| FR-TRX-004 | `EDITOR+` puede dividir una transacción en ≥ 2 categorías (Invariante I1). |
| FR-TRX-005 | `EDITOR+` puede crear una transferencia entre dos cuentas; ambos lados se crean/editan/anulan juntos (I2). |
| FR-TRX-006 | `EDITOR+` puede marcar confirmada/pendiente, aprobar, poner marca de color. |
| FR-TRX-007 | `EDITOR+` puede duplicar y mover a otra cuenta. |
| FR-TRX-008 | `EDITOR+` puede editar en lote hasta 500 transacciones. |
| FR-TRX-009 | Cualquier miembro puede buscar/filtrar/ordenar el registro. |
| FR-TRX-010 | El registro admite reembolsos con política de destino (misma categoría por defecto). |
| FR-PAY-001 | Los comercios se crean al escribir un nombre nuevo, se normalizan y se pueden renombrar y fusionar. |

## 04.4 Reglas de negocio

### Creación y campos

| ID | Regla |
|---|---|
| BR-TRX-001 | `amount_minor ≠ 0`; entero; `|amount| ≤ 9_000_000_000_000` (límite seguro). Signo según A2. |
| BR-TRX-002 | `date` ∈ [1990-01-01, hoy+10 años] (`DATE`, tz del presupuesto). Fechas **futuras permitidas**: cuentan en el mes de su fecha, no en el saldo "de hoy" (ADR-G8). |
| BR-TRX-003 | `memo` ≤ 200 caracteres, sin saltos de línea (se convierten en espacio). |
| BR-TRX-004 | La cuenta debe pertenecer al mismo presupuesto y estar abierta (`ACCOUNT_CLOSED`). FK compuesta. |
| BR-TRX-005 | `currency` de la transacción = `account.currency` (copiada por trigger; el cliente no la envía). |
| BR-TRX-006 | `kind` ∈ `standard` \| `transfer` \| `starting_balance` \| `reconciliation_adjustment`. Solo `standard` y `transfer` son creables por el usuario. |
| BR-TRX-007 | `source` ∈ `manual` \| `bank_sync` \| `import` \| `scheduled` \| `ai` \| `system` (auditoría y *debugging*; no cambia reglas). |

### Categoría (qué exige cada combinación)

| Cuenta origen | Tipo de movimiento | Categoría | Efecto |
|---|---|---|---|
| on-budget (no tarjeta) | gasto (−) | **requerida** o vacía ⇒ "sin categoría" | reduce `available` de la categoría (cash) |
| on-budget (no tarjeta) | ingreso (+) | `inflow_rta` o categoría de gasto (reembolso) | RTA (`I`) o devuelve a la categoría |
| `CREDIT_CARD` | compra (−) | requerida o vacía | reduce `available` (credit) y mueve a Pago de tarjeta (Spec 07) |
| `CREDIT_CARD` | reembolso (+) | categoría original | devuelve a la categoría; sale de Pago de tarjeta (ADR-G3) |
| off-budget (seguimiento) | cualquiera | **ninguna** (`category_id` NULL, y no se permite) | no afecta el plan |

| ID | Regla |
|---|---|
| BR-TRX-010 | Categoría **opcional** al guardar (permite capturar rápido); si falta, la transacción queda `needs_category` y aparece en Atención (Spec 02). |
| BR-TRX-011 | Transacciones en cuentas **off-budget no admiten categoría** (`VALIDATION_FAILED`). |
| BR-TRX-012 | No se pueden usar categorías **archivadas** ni de tipo `credit_card_payment` como categoría de una transacción normal (los pagos se registran como transferencias). `inflow_rta` **solo** admite montos positivos... **excepción:** ajustes/saldos iniciales negativos generados por el sistema. |
| BR-TRX-013 | `is_approved`: `true` por defecto en manual; `false` en `import`/`scheduled` hasta que el usuario apruebe (Spec 09/10). No aprobada **sigue afectando** saldos y categorías (🟦: el plan refleja lo importado aunque falte revisar). |
| BR-TRX-014 | `flag_color` ∈ {`red`,`orange`,`yellow`,`green`,`blue`,`purple`} o NULL. Informativo. |

### Estados

```text
        crear
          │
          ▼
       PENDING ──(confirmar)──► CLEARED ──(conciliar, Spec 08)──► RECONCILED
          ▲                        │                                   │
          └────(desconfirmar)──────┘                                   │
          │                                                            │
          ▼ anular (desde PENDING/CLEARED/RECONCILED con desbloqueo)   │
       VOIDED ◄────────────────────────────────────────────────────────┘
```

| ID | Regla |
|---|---|
| BR-TRX-020 | Transiciones válidas: `PENDING⇄CLEARED`, `CLEARED→RECONCILED` (solo por Spec 08), `*→VOIDED`, `VOIDED→(estado previo)` con "restaurar" (`voided_from_status`). `RECONCILED→CLEARED` solo por **desbloqueo** (BR-TRX-060). |
| BR-TRX-021 | `VOIDED`: `voided_at`, `voided_by`, `void_reason?` obligatorios; se excluye de **todo** cálculo (saldos, categorías, reportes). No se edita salvo restaurar. |
| BR-TRX-022 | Cuentas en efectivo (`CASH`): las transacciones nuevas nacen `CLEARED` (🟦: no hay "pendiente" en efectivo). |
| BR-TRX-023 | Transacciones de fecha **futura** nacen `PENDING` y no pueden marcarse `CLEARED` hasta su fecha (validación). |

### Splits (Invariante I1)

| ID | Regla |
|---|---|
| BR-TRX-040 | Una transacción con splits tiene `is_split=true`, `category_id=NULL` y **≥ 2** filas en `transaction_splits`. |
| BR-TRX-041 | **I1:** `Σ splits.amount_minor = transaction.amount_minor` en todo momento (constraint trigger **diferido** + validación de comando). |
| BR-TRX-042 | Cada split: `amount_minor ≠ 0`, categoría válida (mismas reglas que BR-TRX-011/012), `memo ≤ 200`. Se permiten signos mixtos (p. ej. compra con un artículo devuelto) mientras la suma cuadre. |
| BR-TRX-043 | Cambiar el monto del padre **exige** enviar los splits nuevos en el mismo comando (o `autoScale:true` que reparte proporcionalmente con la regla de resto §140). Si no cuadra ⇒ `INVALID_SPLIT` con `diff`. |
| BR-TRX-044 | Reparto por porcentajes/partes (herramienta de UI): usa la política de redondeo **§140**: `floor` por línea y el resto a la **última** línea. |
| BR-TRX-045 | En cuentas off-budget **no** hay splits. En la Fase 1 los splits **no** contienen transferencias (ADR-G19; se habilita en fase posterior). |
| BR-TRX-046 | Los splits de una transacción en `CREDIT_CARD` siguen las reglas de tarjeta línea por línea (Spec 07). |

### Transferencias (Invariante I2)

| ID | Regla |
|---|---|
| BR-TRX-050 | Una transferencia = **2** transacciones `kind='transfer'` con el mismo `transfer_group_id`; una negativa (origen) y una positiva (destino) con `|monto|` idéntico. Se crean/editan/anulan **en la misma transacción de BD**. |
| BR-TRX-051 | Cada lado guarda `transfer_peer_id` (id del otro lado). El par cumple: `A.transfer_peer_id = B.id`, `B.transfer_peer_id = A.id`. |
| BR-TRX-052 | Origen ≠ destino (`TRANSFER_SAME_ACCOUNT`); mismo `currency` (`TRANSFER_CURRENCY_MISMATCH`); destino abierto (`TRANSFER_CLOSED_ACCOUNT`); mismo presupuesto. |
| BR-TRX-053 | Estado, marca y `is_approved` son **por lado** (cada cuenta concilia lo suyo). Monto, fecha y nota se sincronizan entre ambos lados. |
| BR-TRX-054 | **Presupuesto → presupuesto (on-budget ↔ on-budget):** sin categoría en ningún lado; no cambia Por asignar ni categorías (salvo pago de tarjeta, Spec 07). |
| BR-TRX-055 | **Presupuesto → seguimiento:** el lado on-budget **requiere categoría** (es un gasto, p. ej. "Inversiones") y el lado de seguimiento no lleva categoría. **Seguimiento → presupuesto:** el lado on-budget requiere categoría (normalmente `inflow_rta`). |
| BR-TRX-056 | **Tarjeta → tarjeta:** `CC_TO_CC_UNSUPPORTED` (ADR-G4). Transferencia **hacia** una tarjeta desde una cuenta on-budget no-tarjeta = **pago de tarjeta** (Spec 07). |
| BR-TRX-057 | Editar el monto de un lado edita ambos; cambiar la cuenta de un lado es una operación de "mover" que valida BR-TRX-052 y actualiza al par. |
| BR-TRX-058 | Anular un lado anula el par (con confirmación). Restaurar restaura ambos. |

### Reembolsos y otros

| ID | Regla |
|---|---|
| BR-TRX-070 | **Reembolso** = entrada (+) categorizada en la **misma categoría del gasto** (por defecto). Opción "Devolver a Por asignar" ⇒ categoría `inflow_rta`. **Un reembolso nunca cuenta como ingreso en reportes** salvo que vaya a `inflow_rta` (BR-RPT-010). |
| BR-TRX-071 | Ingreso: categoría `inflow_rta`. Ingreso sin categoría permanece `needs_category` y **no** suma a Por asignar (A5.4). |
| BR-TRX-072 | **Duplicado potencial:** misma cuenta + mismo monto + fecha ±1 día + mismo comercio en creación manual ⇒ advertencia no bloqueante ("¿Es un duplicado de …?"). Import lo trata distinto (Spec 09). |
| BR-TRX-073 | Mover a otra cuenta (`moveToAccount`): mismas reglas de categoría de la cuenta destino (si destino es off-budget se **borra** la categoría con confirmación) y no aplica a conciliadas ni a transferencias. |
| BR-TRX-074 | **Reembolso esperado (reimbursement):** un gasto puede enlazarse con `reimbursement_group_id` a un ingreso futuro (`-300` ahora, `+300` esperado). El reembolso futuro se representa como **ingreso programado** (Spec 10) y solo afecta saldos/categorías cuando se registra. Destino del reembolso: categoría original, Por asignar u otra categoría; la UI **sugiere** la original pero no la asume. |

### Conciliadas (ADR-G7)

| ID | Regla |
|---|---|
| BR-TRX-060 | En `RECONCILED` están **bloqueados** `amount`, `date`, `account`, `splits` y anulación. Editables sin desbloqueo: `memo`, `category` (solo entre categorías de igual tipo), `payee`, `flag`. |
| BR-TRX-061 | **Desbloquear** (`unlockReconciled`) exige rol `EDITOR+`, confirmación con texto "Esto puede descuadrar tu conciliación" y escribe `audit_events('transaction.unlocked')`; la transacción pasa a `CLEARED` y la cuenta queda `reconcile_dirty=true` hasta la siguiente conciliación. |
| BR-TRX-062 | Al intentar cambiar monto/cuenta/fecha de una transacción `RECONCILED`, la UI ofrece: **[Crear corrección]** (transacción `reconciliation_adjustment`, Spec 08) · **[Duplicar y reemplazar]** (nueva transacción + anular la anterior con desbloqueo) · **[Desbloquear para editar]** (BR-TRX-061) · **[Cancelar]**. Nunca se "desconcilia" en silencio. |

### Comercios (payees)

| ID | Regla |
|---|---|
| BR-PAY-001 | `name` `trim` 1–100; `normalized_name = normalize(name)` (minúsculas, sin tildes, sin signos, espacios colapsados, sin sufijos de sucursal `#123`). Único por presupuesto. |
| BR-PAY-002 | Al escribir un nombre nuevo se crea el comercio; si su `normalized_name` coincide con uno existente, se **reusa** (no duplica). |
| BR-PAY-003 | `default_category_id`: se actualiza al guardar una transacción manual con categoría (último uso). Sugerencia de autocompletar = categoría más usada en los últimos 90 días; empate ⇒ la última. |
| BR-PAY-004 | **Renombrar** cambia solo el nombre visible (y `normalized_name`); si choca con otro ⇒ ofrece **fusionar**. |
| BR-PAY-005 | **Fusionar** `source→target`: reasigna transacciones (`payee_id`), programadas y reglas; `source` queda `archived_at`+`merged_into_id`. |
| BR-PAY-006 | Comercios sin uso pueden archivarse; no hay borrado físico. |
| BR-PAY-007 | En transacciones bancarias/importadas se guarda el comercio **crudo** (`raw_description`) además del `payee_id` normalizado. Normalizar (`AMZN Mktp 123`, `AMZN*123`, `Amazon Marketplace` → `Amazon`) **nunca destruye** la descripción original. |

## 04.5 Modelo de datos

```sql
create table payees (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  normalized_name text not null,
  default_category_id uuid,                                  -- FK compuesta abajo
  default_memo text check (char_length(default_memo) <= 200),
  merged_into_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (id, budget_id),
  foreign key (default_category_id, budget_id) references categories (id, budget_id)
);
create unique index payees_norm_uq on payees (budget_id, normalized_name) where archived_at is null;
create index payees_search_idx on payees using gin (normalized_name gin_trgm_ops);   -- extensión pg_trgm

create table transactions (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  account_id uuid not null,
  date date not null check (date between '1990-01-01' and (current_date + interval '10 years')),
  payee_id uuid,
  category_id uuid,                                          -- NULL si: split, transferencia entre on-budget, off-budget, saldo inicial de tarjeta, sin categorizar
  amount_minor bigint not null check (amount_minor <> 0),
  currency char(3) not null,
  memo text not null default '' check (char_length(memo) <= 200),
  kind text not null default 'standard' check (kind in ('standard','transfer','starting_balance','reconciliation_adjustment')),
  status text not null default 'PENDING' check (status in ('PENDING','CLEARED','RECONCILED','VOIDED')),
  is_approved boolean not null default true,
  flag_color text check (flag_color in ('red','orange','yellow','green','blue','purple')),
  is_split boolean not null default false,
  transfer_group_id uuid,
  transfer_peer_id uuid,
  cleared_at timestamptz, reconciled_at timestamptz, reconciliation_id uuid,
  voided_at timestamptz, voided_by uuid, void_reason text, voided_from_status text,
  source text not null default 'manual' check (source in ('manual','bank_sync','import','scheduled','ai','system')),
  import_id uuid,                                            -- Spec 09
  external_id text,                                          -- id del proveedor/archivo
  authorized_date date,                                      -- dato bancario auxiliar (A3); no lo usa el motor
  raw_description text,                                      -- descripción original importada; NUNCA se sobrescribe (BR-PAY-007)
  reimbursement_group_id uuid,                               -- gasto ↔ reembolso esperado (BR-TRX-074)
  scheduled_id uuid, occurrence_date date,                   -- Spec 10
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (id, budget_id),
  foreign key (account_id, budget_id) references accounts (id, budget_id),
  foreign key (payee_id, budget_id) references payees (id, budget_id),
  foreign key (category_id, budget_id) references categories (id, budget_id),
  check ((kind = 'transfer') = (transfer_group_id is not null)),
  check (not is_split or category_id is null),
  check (status <> 'VOIDED' or (voided_at is not null and voided_by is not null)),
  check (status <> 'RECONCILED' or reconciled_at is not null)
);
create index tx_account_date_idx on transactions (account_id, date desc) where status <> 'VOIDED';
create index tx_budget_date_idx  on transactions (budget_id, date desc)  where status <> 'VOIDED';
create index tx_category_date_idx on transactions (category_id, date)    where status <> 'VOIDED';
create index tx_payee_idx        on transactions (payee_id)              where status <> 'VOIDED';
create index tx_transfer_idx     on transactions (transfer_group_id)     where transfer_group_id is not null;
create index tx_review_idx       on transactions (budget_id) where status <> 'VOIDED' and (is_approved = false or (category_id is null and not is_split and kind = 'standard'));
create unique index tx_external_uq on transactions (account_id, external_id) where external_id is not null and status <> 'VOIDED';

create table transaction_splits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,
  budget_id uuid not null,
  category_id uuid not null,
  amount_minor bigint not null check (amount_minor <> 0),
  memo text not null default '' check (char_length(memo) <= 200),
  position int not null check (position >= 0),
  foreign key (transaction_id, budget_id) references transactions (id, budget_id) on delete cascade,
  foreign key (category_id, budget_id) references categories (id, budget_id),
  unique (transaction_id, position)
);
create index on transaction_splits (category_id);

-- I1 diferido: Σ splits = padre
create function check_split_sum() returns trigger language plpgsql as $$
declare t_id uuid := coalesce(new.transaction_id, old.transaction_id); v_sum bigint; v_amt bigint; v_split boolean;
begin
  select amount_minor, is_split into v_amt, v_split from transactions where id = t_id;
  if v_split then
    select coalesce(sum(amount_minor),0) into v_sum from transaction_splits where transaction_id = t_id;
    if v_sum <> v_amt then raise exception 'INVALID_SPLIT: sum % <> amount %', v_sum, v_amt; end if;
  end if;
  return null;
end $$;
create constraint trigger splits_sum_ct after insert or update or delete on transaction_splits
  deferrable initially deferred for each row execute function check_split_sum();
-- (crear también un constraint trigger equivalente AFTER UPDATE OF amount_minor, is_split ON transactions)

-- I2: par de transferencias (verificación diferida)
create function check_transfer_pair() returns trigger language plpgsql as $$
begin
  if new.kind = 'transfer' and new.status <> 'VOIDED' then
    perform 1 from transactions p
      where p.transfer_group_id = new.transfer_group_id and p.id <> new.id
        and p.kind = 'transfer' and p.status <> 'VOIDED'
        and p.amount_minor = -new.amount_minor and p.account_id <> new.account_id;
    if not found then raise exception 'INVALID_TRANSFER_PAIR'; end if;
  end if;
  return null;
end $$;
create constraint trigger transfer_pair_ct after insert or update on transactions
  deferrable initially deferred for each row execute function check_transfer_pair();

-- Trigger: currency = account.currency; bloquear edición de RECONCILED (campos protegidos) salvo flag de sesión app.unlock=on
```

**Vista de líneas (fuente para el motor y reportes)** — una fila por línea de categoría:

```sql
create view v_txn_lines as
select t.id as transaction_id, t.budget_id, t.account_id, t.date,
       date_trunc('month', t.date)::date as month,
       coalesce(s.category_id, t.category_id)  as category_id,
       coalesce(s.amount_minor, t.amount_minor) as amount_minor,
       t.kind, t.status, t.payee_id, a.type as account_type, a.is_on_budget,
       (t.transfer_group_id is not null) as is_transfer
from transactions t
join accounts a on a.id = t.account_id
left join transaction_splits s on s.transaction_id = t.id       -- solo existen si is_split
where t.status <> 'VOIDED';
```

**Tablas auxiliares:** `attention_dismissals(user_id, item_id text, until timestamptz, primary key(user_id,item_id))`; `saved_filters(id, budget_id, user_id, name, filter jsonb)`.

**RLS:** plantilla A8.3 para `transactions`, `transaction_splits`, `payees` (`select` VIEWER, escritura EDITOR). Sin `DELETE`.

## 04.6 Backend

### 04.6.1 Comandos

| Comando | Entrada | Reglas / efecto | Errores |
|---|---|---|---|
| `createTransaction` | `budgetId, accountId, date, amountMinor, payee{id?|name?}, categoryId?, memo?, status?, flag?, splits?[], idempotency_key` | BR-TRX-001..014, 040..046; crea/reusa payee; guarda `payees.default_category_id`; devuelve `TxDTO` + `UndoDescriptor` | `AMOUNT_ZERO`, `INVALID_SPLIT`, `ACCOUNT_CLOSED`, `VALIDATION_FAILED` |
| `updateTransaction` | `id, version, patch{…}` | BR-TRX-020..023, 043, 060; si `is_split` y cambia monto ⇒ exige splits | `CONFLICT_VERSION`, `TRANSACTION_RECONCILED_LOCKED`, `TRANSACTION_VOIDED`, `INVALID_SPLIT` |
| `setSplits` | `transactionId, version, splits[] | null` | reemplaza atómicamente; `null` deshace el split (elige `categoryId` final) | `INVALID_SPLIT` |
| `transferMoney` | `budgetId, fromAccountId, toAccountId, date, amountMinor(>0), memo?, categoryId?(según BR-TRX-055), idempotency_key` | crea 2 filas + par; devuelve ambos ids | `TRANSFER_*`, `CC_TO_CC_UNSUPPORTED`, `AMOUNT_ZERO` |
| `updateTransfer` | `groupId, version, patch{amount,date,memo,fromAccountId?,toAccountId?}` | BR-TRX-053,057 | idem |
| `voidTransaction` | `id, reason?` | BR-TRX-021, 058, 060 | `TRANSACTION_RECONCILED_LOCKED` |
| `restoreTransaction` | `id` | vuelve a `voided_from_status` | – |
| `setCleared` / `setApproved` / `setFlag` | `ids[], value` | BR-TRX-020,023; lote ≤ 500 | – |
| `duplicateTransaction` | `id, {date?}` | copia sin estado conciliado, `status=PENDING` (CASH: `CLEARED`) | – |
| `moveToAccount` | `id, accountId` | BR-TRX-073 | `ACCOUNT_CLOSED`, `TRANSFER_*` |
| `bulkUpdate` | `ids[], patch{categoryId?,payee?,date?,memo?,flag?,status?,approved?}` | todo-o-nada en una transacción; omite/rechaza conciliadas con lista de rechazos | parcial ⇒ `PARTIAL_FAILURE` (detalle por id) |
| `unlockReconciled` | `id, confirm:true` | BR-TRX-061 | `PERMISSION_DENIED` |
| `renamePayee` / `mergePayees` / `archivePayee` | | BR-PAY-004..006 | `CONFLICT_VERSION` |

> `PARTIAL_FAILURE` (207) se añade al catálogo A6. Los lotes son **todo-o-nada** salvo el caso de conciliadas, donde se aplican las válidas y se devuelve la lista de las rechazadas.

### 04.6.2 Queries

- `getAccountRegister(budgetId, accountId|'all', {cursor, limit=100, filters, sort})` → páginas por **cursor** `(date, id)` (nunca `OFFSET`). Filtros: rango de fecha, texto (nota/comercio, trigram), categoría(s), comercio(s), monto (mín/máx, tipo), estado, `is_approved`, marca, sin categoría, tipo (`standard/transfer`), cuenta(s).
- `getTransaction(id)` → detalle con splits, par de transferencia, historial resumido (auditoría).
- `searchPayees(budgetId, q, limit=8)` → ranking: coincidencia por prefijo > trigram > frecuencia (últimos 90 días) > recencia.
- `getCategorySuggestion(budgetId, payeeId)` → `{categoryId, reason: 'last'|'frequent', confidence}`.
- `getReviewQueue(budgetId)` → transacciones sin aprobar / sin categoría (alimenta Atención).

**DTO de transacción**

```ts
type TxDTO = {
  id; accountId; date: '2026-09-15';
  amount: Money;                       // con signo
  payee: { id; name } | null;          // null en transferencias/saldo inicial: la UI deriva la etiqueta
  transfer: { peerAccountId; peerAccountName; groupId } | null;
  category: { id; name } | null; splits: { categoryId; categoryName; amount: Money; memo }[] | null;
  memo: string; status: 'PENDING'|'CLEARED'|'RECONCILED'|'VOIDED';
  isApproved: boolean; flag: Color|null; kind: 'standard'|'transfer'|'starting_balance'|'reconciliation_adjustment';
  needsCategory: boolean; locked: boolean;         // locked = RECONCILED
  version: number; source: 'manual'|'import'|'scheduled'|'ai';
};
```

### 04.6.3 Efectos en otros módulos (contrato)

Toda mutación de `transactions`/`splits` **invalida** `['budget', id, 'months']`, `['budget', id, 'accounts']`, `['budget', id, 'register', accountId]`. **No** recalcula nada en el comando: los saldos y el presupuesto se derivan al leer (P5). Emite evento interno `TransactionCreated|Updated|Voided`.

### 04.6.4 Auditoría

`transaction.created|updated|voided|restored|unlocked|split_changed|approved|moved`, `transfer.created|updated|voided`, `payee.renamed|merged`. `before/after` incluyen solo campos cambiados.

## 04.7 UI

### 04.7.1 Registro de transacciones (Nivel 2→3)

Columnas (desktop): ☐ · **Fecha** · **Comercio** · **Categoría** · **Nota** · **Monto** (rojo/verde con signo **y** flecha ↑↓, no solo color) · **Estado** (ícono: reloj = pendiente, ✓ = confirmada, 🔒 = conciliada) · **Marca** · **Aprobación** (punto azul si `is_approved=false`). En "Todas las cuentas" se añade **Cuenta**.

- **Superficie opaca** (57), filas de 44 px, virtualizadas (`@tanstack/react-virtual`), scroll infinito por cursor.
- **Transferencias** muestran "↔ Transferencia a Ahorros" (derivado) y ícono; splits muestran "Dividida (3)" expandible en línea.
- **Sin categoría:** chip dorado "Sin categoría" (⚠ + texto).
- **Fechas futuras:** fila atenuada con etiqueta "Programada/futura".
- **Barra superior del registro:** buscador (con `/` para enfocar), filtros (chips: Sin categoría · Sin aprobar · Pendientes · Rango de fechas · Monto…), orden, "Guardar filtro", contador "42 de 1.203".
- **Selección múltiple:** clic en ☐, `Shift+clic` rango, `Ctrl+A`. Barra de acciones flotante: Categoría · Comercio · Fecha · Nota · Marca · Confirmar · Aprobar · Anular.
- **Edición en línea:** `Enter` o doble clic sobre celda → editor inline (categoría con `Combobox`; monto con `CalcInput`); `Tab` avanza; `Esc` cancela; guarda al confirmar.
- **Móvil:** lista tipo tarjeta (fecha agrupada, comercio, categoría, monto); toque → Sheet de detalle; *swipe* izquierda = Anular (con deshacer), derecha = Confirmar.

### 04.7.2 Captura rápida (Sheet "Nueva transacción", tecla `N` / botón `+`) — objetivo < 10 s

```text
┌ Nueva transacción ─────────────────────┐
│  [ Gasto | Ingreso | Transferencia ]    │   ← segmentado; por defecto Gasto (recuerda el último)
│  Bs [ 25+18,5      ]  = 43,50          │   ← CalcInput autofocus, teclado numérico (móvil: teclado propio)
│  Comercio  [ Starbucks           ▾ ]    │   ← Combobox con sugerencias; crea si es nuevo
│  Categoría [ Comida  (sugerida)  ▾ ]    │   ← autocompletada; chip "¿Por qué?" (último uso 14 veces)
│  Cuenta    [ Corriente BNB       ▾ ]    │   ← última usada
│  Fecha     [ Hoy ▾ ]   Nota [ … ]       │
│  ▸ Dividir en categorías                │
│  Efecto: −Bs 43,50 en «Comida» · Disponible quedaría Bs 556,50
│  [ Guardar ]   [ Guardar y agregar otra ]│
└─────────────────────────────────────────┘
```

- El foco inicia en **Monto**; `Enter` en cualquier campo avanza; `Ctrl+Enter` guarda; `Esc` cierra pidiendo confirmar si hay cambios.
- **Efecto en vivo** ("Disponible quedaría …") usa `calculateCategoryState` (dominio puro) con el estado actual del mes: sin llamar al servidor.
- **Modo Ingreso:** categoría por defecto "Ingreso: por asignar"; mensaje "Por asignar +Bs X". **Modo Transferencia:** De / A / Monto / Fecha; si destino es tarjeta muestra "Pago de tarjeta" y el efecto en `Pago Visa`; si es seguimiento pide categoría.
- **Duplicado potencial** (BR-TRX-072): banda dorada "Parece igual a «Starbucks 43,50 · ayer» [Ver] [Guardar igual]".
- **Reembolso:** casilla "Es un reembolso de una compra" → selector de destino (misma categoría / Por asignar).
- Guardado optimista **solo** para creación simple; si el servidor rechaza, la fila se retira y se muestra el error A6 con "Corregir".
- **Sugerencias no invasivas:** la categoría sugerida por historial/IA no pisa una regla explícita del usuario (Parte C, orden de decisión).

### 04.7.3 Dividir (Sheet secundario, mismo panel — no navega)

```text
Compra Supermercado                      Bs 150,00
[ Comida      Bs 100,00  nota ]  [✕]
[ Limpieza    Bs  30,00  nota ]  [✕]
[ Hogar       Bs  20,00  nota ]  [✕]
[ + Agregar línea ]   [ Repartir en partes iguales ]  [ Asignar el resto a … ]
─────────────────────────────────────────
Suma Bs 150,00 de Bs 150,00     ✓ Cuadra
[ Guardar ]   ← deshabilitado mientras "Faltan Bs X" (mensaje A6 con botón "Poner el resto en…")
```
`CalcInput` en cada línea; "Repartir en partes iguales" aplica §140 (33,33 / 33,33 / 33,34). Si el total cambia, se muestra el desajuste en vivo.

### 04.7.4 Detalle de transacción (Nivel 3, Sheet desde abajo con fondo atenuado)
Campos editables, "Efecto en el presupuesto" (líneas: cuenta −Bs 43,50; Comida: disponible antes/después), historial de cambios (Nivel 4 → panel opaco con auditoría), botones **Duplicar · Mover · Anular**. Si `RECONCILED`: banner "Conciliada 🔒" + botón **Desbloquear para editar**.

### 04.7.5 Gestión de comercios (`/settings/payees`)
Tabla con nombre, nº de transacciones, categoría por defecto; acciones: renombrar en línea, **Fusionar…** (seleccionar varios → elegir nombre final), archivar. Sugerencias de fusión ("Walmart 202", "WAL-MART" → "Walmart") con casilla por sugerencia.

### 04.7.6 Textos de error (ejemplo, plan §144)
> **No se pudo guardar.** La distribución de esta compra suma Bs 145, pero la compra es de Bs 150. Faltan **Bs 5**. [Poner el resto en «Hogar»] [Corregir]

## 04.8 Casos borde

- Monto con **más decimales** de los de la moneda (BOB 2): el `CalcInput` redondea al confirmar (regla §140) y muestra el aviso "Se redondeó a Bs 33,33".
- Editar fecha de una transacción a **otro mes**: cambia la actividad de dos meses; ambos se invalidan.
- Transferencia con **fecha futura**: ambos lados `PENDING`, no cuentan en saldo de hoy.
- Anular un lado de una transferencia con un lado `RECONCILED` ⇒ requiere desbloquear ambos (`TRANSACTION_RECONCILED_LOCKED`).
- Split donde una línea queda sin categoría ⇒ rechazado (cada línea requiere categoría).
- Payee nuevo con solo espacios/emoji ⇒ `VALIDATION_FAILED`; nombres de 100+ caracteres se rechazan (no se truncan).
- Editar el monto de una transacción en tarjeta cambia el reparto "financiado/no financiado" del mes (lo recalcula el motor).
- Doble envío del Sheet (Enter repetido) ⇒ `idempotency_key` por apertura del Sheet.
- Mover a cuenta cerrada ⇒ `ACCOUNT_CLOSED`.
- 500+ transacciones seleccionadas ⇒ límite de lote; mensaje "Máximo 500 por vez".
- Zona horaria: crear "hoy" a las 23:30 en La Paz usa la fecha local del presupuesto, no UTC.

## 04.9 Criterios de aceptación

```text
AC-TRX-01  Given cuenta con Bs 500 y Comida con Bs 100 disponibles
           When registra gasto Bs 50 en Comida
           Then cuenta = Bs 450, Comida.available = Bs 50, Por asignar sin cambio.

AC-TRX-02  Given gasto de −15000 dividido en −10000/−3000/−2000
           Then se guarda; con −10000/−3000/−1500 ⇒ INVALID_SPLIT (faltan 500) y no persiste nada.

AC-TRX-03  Given transferencia de Bs 500 de A a B (ambas on-budget)
           Then existen 2 filas: A −50000, B +50000, mismo transfer_group_id; Por asignar y categorías no cambian.

AC-TRX-04  Given transferencia y se anula el lado A
           Then el lado B también queda VOIDED y los saldos vuelven al estado previo.

AC-TRX-05  Given transferencia de una cuenta on-budget a una de seguimiento sin categoría
           Then VALIDATION_FAILED "Elige la categoría de este gasto".

AC-TRX-06  Given transacción RECONCILED
           When intenta cambiar el monto
           Then TRANSACTION_RECONCILED_LOCKED; tras unlockReconciled puede editar y la cuenta queda reconcile_dirty.

AC-TRX-07  Given comercio "Starbucks" usado 14 veces en Comida
           When escribe "Star"
           Then se sugiere Comida con motivo y 1 toque la acepta.

AC-TRX-08  Given reembolso de Bs 100 en la categoría Compras
           Then Compras.available +100 y el reporte de ingresos NO cambia.

AC-TRX-09  Given dos pestañas editan la misma transacción
           Then la segunda recibe CONFLICT_VERSION y ve los valores actuales.

AC-TRX-10  Given usuario móvil
           When abre el Sheet, escribe 25+18.5, elige comercio y guarda
           Then el flujo completo toma < 10 s (E2E cronometrado en CI con presupuesto de 12 s por variabilidad).

AC-TRX-11  Given seleccionar 30 transacciones (2 conciliadas) y categorizar en lote
           Then 28 se actualizan y se devuelve la lista de 2 rechazadas con motivo.
```

## 04.10 Tests requeridos

- **Unit (dominio puro):** `validateAmount`, `normalizePayee` (tabla: `WALMART #202`, `Walmart 202`, `WAL-MART` → `walmart`), `distribute(total, n)` (§140), `validateSplits`, `categoryRuleFor(accountType, direction)`, `transferSides(from,to,amount)`, `nextStatus` (tabla completa de transiciones).
- **Property:** (I1) para splits aleatorios válidos `Σ = padre` y para inválidos el validador falla; (I2) para transferencias aleatorias `A+B=0` y `|A|=|B|`; `distribute` conserva el total y difiere ≤ 1 unidad entre líneas.
- **Integración (Postgres real):** triggers I1/I2 rechazan inserciones inconsistentes; FK compuesta impide cuenta de otro presupuesto; `v_txn_lines` no duplica líneas; índices usados (`EXPLAIN` sin seq scan en 100k filas); RLS por rol.
- **Concurrencia:** dos `updateTransaction` simultáneos ⇒ uno gana, otro `CONFLICT_VERSION`.
- **E2E:** Journey 1 (registrar gasto y ver disponible), dividir, transferir, anular/deshacer, desbloquear conciliada, edición masiva, captura móvil < 10 s.

## 04.12 No hacer

🟥 Eliminar filas de `transactions` o `transaction_splits` (anular) · 🟥 guardar `date` como `timestamptz` · 🟥 crear el par de transferencia en dos llamadas separadas · 🟥 validar splits solo en la UI · 🟥 recalcular saldos/categorías dentro de los comandos de transacciones · 🟥 usar `OFFSET` en el registro · 🟥 permitir categoría en cuentas de seguimiento · 🟥 tratar un reembolso como ingreso por defecto · 🟥 aplicar cambios de IA sin `source='ai'` y aprobación.

---

---
