# SPEC 02 — WORKSPACES, BUDGETS & CATEGORIES

**Dependencias:** 01. **Hito:** M1. **Prefijos:** `FR-BUD`, `BR-BUD`, `FR-CAT`, `BR-CAT`.
**Alcance de la UI en esta spec:** creación/gestión de presupuestos, editor de estructura de categorías y **Inicio (dashboard action-first)**.
La **grilla de presupuesto** (Asignado/Actividad/Disponible) se entrega en la Spec 05 (M2), porque depende del motor.

## 02.1 Cómo funciona YNAB (🟦)

- Un usuario puede tener **varios planes** (presupuestos) independientes; cada uno tiene su moneda y formatos.
- El plan se organiza en **grupos de categorías** y **categorías**; se pueden **crear, renombrar, reordenar (arrastrar), ocultar y eliminar**. Las categorías ocultas siguen existiendo con su historial.
- Existe una categoría especial **"Inflow: Ready to Assign"** para ingresos: no se planifica ni se puede eliminar; el dinero entra directamente al "Ready to Assign".
- Los meses **se crean automáticamente** al navegar; no hay que "crear el mes". Se puede navegar a meses futuros.
- En la vista mensual cada categoría muestra **Assigned / Activity / Available**. **Mover dinero** entre categorías es una operación de dos filas de asignación, no una transacción.
- Al eliminar una categoría con transacciones, YNAB pide **reasignarlas a otra**; ocultar es la alternativa segura.
- Al crear una cuenta de tarjeta, aparece automáticamente su **categoría de pago** en un grupo especial (Spec 07).

## 02.2 Qué hará Bolsilludo

| Capacidad | Tipo |
|---|---|
| Múltiples presupuestos; renombrar, archivar, restaurar, eliminar (con retención), duplicar **estructura** | 🟦 paridad |
| Grupos y categorías: CRUD, ocultar, reordenar con arrastre **y con teclado** | 🟦 paridad / 🟩 (a11y) |
| Categoría de sistema `inflow_rta` invisible en la grilla, protegida | 🟦 paridad (ADR-G14: es una fila real, no un caso especial de código) |
| **Plantillas de estructura** (Vacío / Básico / Estudiante / Familia) al crear | 🟩 mejora |
| Icono y color por categoría; nota por categoría | 🟩 mejora |
| **Fusionar categorías** (previa vista del impacto en Por asignar) | 🟦 parcial / 🟩 |
| **Inicio action-first**: Por asignar, disponible, próximos 30 días, metas, alertas, "¿Qué necesita tu atención?" | 🟩 mejora (plan §104) |
| Modo simple/avanzado | 🟩 mejora |
| 🟨 Cambiar moneda base **solo si el presupuesto no tiene cuentas/transacciones** (ADR-G16) | Decisión |
| 🟨 `strict_budgeting` (impedir asignar más de lo disponible) **apagado por defecto**; sobre-asignar solo pinta rojo (ADR-G12) | Decisión |

## 02.3 Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-BUD-001 | Un usuario verificado puede crear un presupuesto con nombre, moneda, zona horaria, mes inicial y plantilla. |
| FR-BUD-002 | Al crear, el sistema genera la categoría de sistema `inflow_rta`, y la estructura de la plantilla, y agrega al creador como `OWNER` — todo en **una transacción**. |
| FR-BUD-003 | Un usuario puede listar y cambiar entre sus presupuestos; se recuerda el último (`profiles.last_budget_id`). |
| FR-BUD-004 | `ADMIN+` puede renombrar y cambiar ajustes (`timezone`, `strict_budgeting`). |
| FR-BUD-005 | `OWNER` puede archivar/restaurar, eliminar (soft, 30 días) y duplicar estructura. |
| FR-BUD-006 | El Inicio muestra las tarjetas y la lista de atención según lo disponible (widgets con capacidades). |
| FR-CAT-001 | `EDITOR+` crea/renombra/oculta/reordena grupos y categorías. |
| FR-CAT-002 | `EDITOR+` archiva una categoría o la **fusiona** en otra. |
| FR-CAT-003 | Las categorías de sistema (`inflow_rta`, `credit_card_payment`) no se editan/eliminan/mueven fuera de su grupo. |
| FR-CAT-004 | Cada categoría admite `note`, `icon`, `color`. |

## 02.4 Reglas de negocio

| ID | Regla |
|---|---|
| BR-BUD-001 | Nombre de presupuesto: `trim`, 1–60 caracteres. Duplicados permitidos (el usuario puede tener dos "Casa"). |
| BR-BUD-002 | `currency` ∈ `currencies` activas; **inmutable** en cuanto exista ≥ 1 cuenta (ADR-G16). |
| BR-BUD-003 | `timezone` IANA válida. Defecto: la del perfil. Cambiarla reinterpreta "hoy" pero **no** cambia fechas de transacciones ya guardadas (son `DATE`). |
| BR-BUD-004 | `start_month`: primer día del mes actual por defecto; no puede ser posterior a `hoy + 12 meses`. Los meses anteriores a `start_month` no se muestran. |
| BR-BUD-005 | Presupuesto eliminado: `deleted_at` ≠ null lo oculta; se purga a los **30 días** con job idempotente; el OWNER puede restaurar antes. Requiere escribir el nombre para confirmar. |
| BR-BUD-006 | Duplicar estructura copia: grupos, categorías (sin sistema de tarjetas), notas/iconos/colores y **metas** (opcional, checkbox). **No** copia cuentas, transacciones ni asignaciones. |
| BR-BUD-007 | Todo presupuesto debe tener ≥ 1 `OWNER`; verificado por trigger/constraint diferida (ver Spec 12). |
| BR-CAT-001 | Nombre de categoría/grupo: `trim`, 1–50 caracteres; único (case-insensitive) dentro de su ámbito **entre no archivados**. |
| BR-CAT-002 | Una categoría siempre pertenece a un grupo del mismo presupuesto (FK compuesta). |
| BR-CAT-003 | `position` es entero **denso** (0..n−1) por ámbito; se reescribe en bloque con `reorder*` (recibe la lista completa y ordenada de ids). Si el conjunto no coincide con el actual → `CONFLICT_VERSION`. |
| BR-CAT-010 | **Ocultar** una categoría/grupo: `is_hidden=true`; conserva asignado, disponible e historial y **sigue contando** en Por asignar. Se muestra en "Ocultas". |
| BR-CAT-020 | **Archivar** categoría: exige que su disponible **del mes actual** sea `0` o que el usuario elija `moveAvailableTo: <categoryId> | 'rta'` (se genera el movimiento). Si el disponible es negativo → `CATEGORY_HAS_BALANCE` (cubrir primero). Las transacciones **no** se tocan; la categoría archivada no se ofrece en formularios pero aparece en reportes con sufijo "(archivada)". |
| BR-CAT-021 | **Fusionar** `source → target`: reasigna todas las líneas (`transactions.category_id`, `transaction_splits.category_id`, `scheduled_transactions`), suma los `assigned` mes a mes en `target`, archiva `source`, escribe eventos. Antes se muestra vista previa del cambio en Por asignar histórico. Solo entre categorías `standard` del mismo presupuesto. |
| BR-CAT-022 | Archivar un **grupo** exige que no tenga categorías activas (o `cascade:true` con las mismas reglas por categoría). |
| BR-CAT-030 | Categorías de sistema: `kind='inflow_rta'` (1 por presupuesto, oculta de la grilla) y `kind='credit_card_payment'` (1 por cuenta de tarjeta, en el grupo de sistema "Pagos de tarjetas"). No editables, no archivables manualmente (`CATEGORY_SYSTEM_PROTECTED`). |
| BR-CAT-031 | El grupo de sistema "Pagos de tarjetas" se crea al añadir la primera tarjeta y se oculta si no tiene categorías activas. |
| BR-CAT-040 | `note` ≤ 500 caracteres; `icon` ∈ catálogo cerrado (emoji o nombre lucide); `color` ∈ tokens de marca (`emerald`, `gold`, `navy`, `sky`, `rose`, `violet`, `slate`) — **nunca hex libre** (P13). |
| BR-CAT-050 | **Sin subcategorías anidadas** en Fase 1: la jerarquía es `Presupuesto → Grupo → Categoría` (un solo nivel de grupo). |

## 02.5 Modelo de datos

```sql
create table budgets (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  currency char(3) not null references currencies(code),
  timezone text not null default 'America/La_Paz',
  start_month date not null check (extract(day from start_month) = 1),
  strict_budgeting boolean not null default false,          -- ADR-G12
  created_by uuid not null references auth.users(id),
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1
);

create table budget_members (
  budget_id uuid not null references budgets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER','ADMIN','EDITOR','VIEWER')),
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  primary key (budget_id, user_id)
);
create index on budget_members (user_id, budget_id);

create table category_groups (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  position int not null check (position >= 0),
  kind text not null default 'standard' check (kind in ('standard','credit_card_payments')),
  is_hidden boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (id, budget_id)
);
create unique index category_groups_name_uq on category_groups (budget_id, lower(name)) where archived_at is null;
create index on category_groups (budget_id, position) where archived_at is null;

create table categories (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null,
  group_id uuid not null,
  name text not null check (char_length(name) between 1 and 50),
  position int not null check (position >= 0),
  kind text not null default 'standard' check (kind in ('standard','inflow_rta','credit_card_payment')),
  linked_account_id uuid,                                   -- FK compuesta a accounts (Spec 03)
  note text check (char_length(note) <= 500),
  icon text, color text check (color in ('emerald','gold','navy','sky','rose','violet','slate')),
  is_hidden boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (id, budget_id),
  foreign key (group_id, budget_id) references category_groups (id, budget_id),
  check ((kind = 'credit_card_payment') = (linked_account_id is not null))
);
create unique index categories_name_uq on categories (group_id, lower(name)) where archived_at is null;
create unique index categories_inflow_uq on categories (budget_id) where kind = 'inflow_rta';
create unique index categories_cc_uq on categories (linked_account_id) where kind = 'credit_card_payment';
create index on categories (budget_id, group_id, position) where archived_at is null;

-- Asignación mensual: ÚNICO dato de planificación que se guarda. Actividad/Disponible se calculan (Spec 05).
create table category_months (
  category_id uuid not null,
  budget_id uuid not null,
  month date not null check (extract(day from month) = 1),
  assigned_minor bigint not null default 0,
  updated_at timestamptz not null default now(),
  version int not null default 1,
  primary key (category_id, month),
  foreign key (category_id, budget_id) references categories (id, budget_id)
);
create index on category_months (budget_id, month);

create table budget_movements (           -- registro de "Mover dinero" (auditable, deshacible)
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  month date not null,
  from_category_id uuid not null,
  to_category_id uuid,                    -- null = devuelto a Por asignar
  amount_minor bigint not null check (amount_minor > 0),
  note text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
```

**RLS:** plantilla A8.3. `budgets`: `select` si miembro; `update` `ADMIN+`; `insert` cualquiera autenticado verificado (con `created_by = auth.uid()`); sin `delete` (solo soft). `budget_members`: `select` miembros; escritura solo por comandos `SECURITY DEFINER` (Spec 12).
**Semilla de sistema:** el comando `createBudget` inserta `inflow_rta` en el grupo oculto "Ingresos" (`kind='standard'`, `is_hidden=true`) — el grupo se marca con `name='__system_income__'` y la UI **nunca** lo lista.

### 02.5.1 Plantillas (`packages/domain/templates/*.json`, textos ES; IDs estables `tpl.basic`, etc.)

```jsonc
// tpl.basic  (plan §14, §106)
{ "id":"tpl.basic","name":"Básico","groups":[
  {"name":"Gastos fijos","categories":[{"name":"Alquiler","icon":"🏠"},{"name":"Internet","icon":"📶"},{"name":"Electricidad","icon":"💡"}]},
  {"name":"Vida diaria","categories":[{"name":"Comida","icon":"🍽️"},{"name":"Transporte","icon":"🚌"},{"name":"Entretenimiento","icon":"🎬"}]},
  {"name":"Objetivos","categories":[{"name":"Fondo de emergencia","icon":"🛟"},{"name":"Vacaciones","icon":"✈️"},{"name":"Equipo","icon":"💻"}]}
]}
// tpl.student: Fijos (Alquiler/Pensión, Internet y datos, Transporte) · Vida diaria (Comida, Útiles y copias, Salidas) · Objetivos (Emergencia, Equipo)
// tpl.family : Fijos (Alquiler, Agua, Luz, Gas, Internet, Educación) · Vida diaria (Supermercado, Transporte, Salud, Ropa, Salidas) · Objetivos (Emergencia, Vacaciones, Reparaciones)
// tpl.empty  : sin grupos (solo sistema)
```
Regla: el onboarding (Spec 01, paso 4) puede **agregar** categorías/metas a partir de los "compromisos" declarados.

## 02.6 Backend

### 02.6.1 Comandos de presupuesto

| Comando | Entrada | Validaciones | Efecto (una transacción) | Errores | Auditoría |
|---|---|---|---|---|---|
| `createBudget` | `name, currency, timezone, startMonth, templateId, idempotency_key` | BR-BUD-001..004; usuario verificado | inserta `budgets`, `budget_members(OWNER)`, grupo de sistema + `inflow_rta`, estructura de plantilla; actualiza `profiles.last_budget_id` | `EMAIL_NOT_VERIFIED`, `VALIDATION_FAILED` | `budget.created` |
| `updateBudget` | `budgetId, patch{name,timezone,strictBudgeting}, version` | `ADMIN+`; BR-BUD-003 | `UPDATE … version` | `CONFLICT_VERSION`, `PERMISSION_DENIED` | `budget.updated` |
| `changeBudgetCurrency` | `budgetId, currency, version` | `OWNER`; 0 cuentas y 0 transacciones (BR-BUD-002) | update | `VALIDATION_FAILED` ("ya tiene movimientos") | `budget.currency_changed` |
| `archiveBudget` / `restoreBudget` | `budgetId` | `OWNER` | `archived_at` | – | `budget.archived` |
| `deleteBudget` | `budgetId, confirmName` | `OWNER`; nombre coincide | `deleted_at=now()` | `VALIDATION_FAILED` | `budget.deleted` |
| `duplicateBudgetStructure` | `budgetId, name, includeGoals` | `OWNER/ADMIN` | crea presupuesto nuevo con estructura (BR-BUD-006) | – | `budget.duplicated` |
| `switchBudget` | `budgetId` | miembro | `profiles.last_budget_id` | `NOT_FOUND` | – |

### 02.6.2 Comandos de estructura

| Comando | Entrada | Reglas | Errores |
|---|---|---|---|
| `createGroup` | `budgetId, name` | BR-CAT-001; posición = al final | `CATEGORY_DUPLICATE_NAME` |
| `renameGroup` / `renameCategory` | `id, name, version` | no sistema | `CATEGORY_SYSTEM_PROTECTED`, `CONFLICT_VERSION` |
| `createCategory` | `budgetId, groupId, name, icon?, color?, note?` | BR-CAT-001/040 | `CATEGORY_DUPLICATE_NAME` |
| `updateCategoryMeta` | `id, {note,icon,color}, version` | BR-CAT-040 | |
| `setHidden` | `entity:'group'|'category', id, hidden` | BR-CAT-010 | `CATEGORY_SYSTEM_PROTECTED` |
| `reorderGroups` | `budgetId, orderedIds[]` | BR-CAT-003 | `CONFLICT_VERSION` |
| `reorderCategories` | `budgetId, groupId, orderedIds[]` (incluye categorías traídas de otro grupo → se mueven) | BR-CAT-003 | `CONFLICT_VERSION` |
| `archiveCategory` | `id, moveAvailableTo?` | BR-CAT-020 | `CATEGORY_HAS_BALANCE`, `CATEGORY_SYSTEM_PROTECTED` |
| `mergeCategories` | `sourceId, targetId, confirmImpactHash` | BR-CAT-021; `confirmImpactHash` = hash de la vista previa (evita aplicar un impacto desactualizado) | `CONFLICT_VERSION` |
| `previewMerge` (query) | `sourceId, targetId` | ejecuta el motor en seco | – |
| `archiveGroup` | `id, cascade?` | BR-CAT-022 | `CATEGORY_HAS_BALANCE` |

> Añadir `CATEGORY_HAS_BALANCE` (422, "Esta categoría tiene dinero disponible o sobregasto. Muévelo o cúbrelo primero.") al catálogo A6.

### 02.6.3 Queries

- `listBudgets()` → `{id,name,currency,role,archived,lastOpenedAt}[]`.
- `getCategoryTree(budgetId, {includeHidden, includeArchived})` → grupos ordenados con categorías ordenadas (sin importes; los importes vienen de la Spec 05).
- `getBudgetOverview(budgetId, month?)` → ver 02.6.4.

### 02.6.4 `getBudgetOverview` (DTO del Inicio)

```ts
type BudgetOverview = {
  budget: { id; name; currency; role; timezone };
  month: '2026-09-01';                                   // mes activo (por defecto: hoy en tz del presupuesto)
  rta:   { availableNow: Money; overassigned: boolean } | null;      // Spec 05
  cash:  { totalOnBudget: Money; creditDebt: Money } | null;         // Spec 03/07
  upcoming30d: { total: Money; count: number } | null;              // Spec 10
  goals: { inProgress: number; underfundedTotal: Money } | null;     // Spec 06
  attention: AttentionItem[];                                        // ordenado y máx. 20
  topCategories: { categoryId; name; spentPct: number; available: Money }[]; // "Tu mes", máx. 5
};
type AttentionItem = {
  id: string;                                            // estable por (fuente, entidad, mes) para descartar/silenciar
  severity: 'CRITICAL'|'ACTION_REQUIRED'|'INSIGHT'|'POSITIVE'|'INFO';
  title: string; body?: string; impact?: Money;
  cta: { label: string; href?: string; action?: string };
  source: 'engine'|'cards'|'goals'|'reconciliation'|'imports'|'scheduled'|'transactions';
};
```

Cada campo es `null` mientras la spec que lo alimenta no exista (capacidad ausente) y la UI **oculta** ese widget. Orden de `attention`: severidad (CRITICAL > ACTION_REQUIRED > INSIGHT > POSITIVE > INFO), luego `impact` desc, luego más reciente. Fuentes mínimas por spec:

| Fuente | Regla que genera el ítem | Spec |
|---|---|---|
| engine | RTA < 0 → CRITICAL "Asignaste Bs X de más" | 05 |
| engine | categoría con sobregasto en efectivo → CRITICAL | 05 |
| engine | categoría con sobregasto con tarjeta → ACTION_REQUIRED | 05/07 |
| cards | déficit de Pago de tarjeta > 0 → CRITICAL "Tarjeta necesita Bs X" | 07 |
| goals | metas con "falta asignar" > 0 → ACTION_REQUIRED | 06 |
| transactions | `N` sin categoría / sin aprobar → INFO/ACTION_REQUIRED | 04 |
| reconciliation | cuenta sin conciliar > 14 días → INSIGHT | 08 |
| imports | lote pendiente de revisión → ACTION_REQUIRED | 09 |
| scheduled | pagos en próximos 7 días sin fondos → ACTION_REQUIRED | 10 |

## 02.7 UI

### 02.7.1 Selector de presupuesto (cabecera de la sidebar)
Botón con nombre + rol; menú: lista de presupuestos (con insignia del rol), "Crear presupuesto", "Archivados". Atajo `Ctrl+B`. En móvil: sheet.

### 02.7.2 `/b/new` — Crear presupuesto (una pantalla, 4 bloques; alt. paso a paso dentro del onboarding)
1. **Nombre** (por defecto "Mi presupuesto").
2. **Moneda** (`Combobox` con buscador; pista: "No podrás cambiarla cuando agregues cuentas").
3. **Plantilla**: 4 tarjetas con vista previa (lista de grupos/categorías al seleccionar).
4. **Avanzado (colapsado):** zona horaria, mes inicial.
Botón primario **Crear presupuesto**. Éxito → `/b/{id}` con Inicio en estado vacío guiado.

### 02.7.3 Inicio (`/b/[budgetId]`) — action-first

```text
Hola, {nombre}                                            [ + Nueva transacción ]
┌─ Por asignar ───────────────┐ ┌─ Disponible ─────┐ ┌─ Próx. 30 días ┐ ┌─ Metas ─┐
│ Bs 720  (verde)             │ │ Bs 1.850          │ │ Bs 960         │ │ 3 en    │
│ [Asignar dinero]            │ │ Tarjetas: −Bs 850 │ │ 5 pagos        │ │ progreso│
└─────────────────────────────┘ └───────────────────┘ └────────────────┘ └─────────┘
¿Qué necesita tu atención?
 ● Tarjeta Visa necesita Bs 140                       [Cubrir]        (crítico)
 ⚠ Comida está al 82%                                 [Ver categoría] (atención)
 ✓ Meta Vacaciones va +8% adelantada                  [Ver meta]      (informativo)
 ℹ 3 movimientos por revisar                          [Revisar]
Tu mes  Comida ▓▓▓▓▓▓▓░░░ 72%   Transporte ▓▓▓▓▓░░░░░ 51%   Hogar ▓▓▓▓░░░░░░ 48%
```

- Tarjetas con `GlassCard`; la lista de atención en superficie **opaca** (advertencias críticas no van en vidrio, 57).
- El estado de **Por asignar**: `>0` → esmeralda + "Asignar dinero"; `=0` → neutro + "Todo tu dinero tiene un trabajo ✓"; `<0` → `--danger` + "Asignaste Bs X de más" + botón "Cubrir".
- Cada ítem de atención: icono + texto (no solo color) y CTA; se puede **posponer 24 h** ("Recordar mañana") o **descartar** el ítem informativo (se guarda en `attention_dismissals(user_id, item_id, until)`).
- **Estado vacío** (presupuesto nuevo): 3 pasos guiados: "1 Agrega una cuenta → 2 Registra tu ingreso → 3 Asigna tu dinero" con progreso.
- **Modo simple/avanzado:** Simple muestra "Disponible / Gastado / Objetivo"; Avanzado añade Asignado/Actividad/Arrastre (Spec 05).

- **Orden canónico de secciones del Inicio** y acciones rápidas: ver A9.8. Cada ítem de atención debe tener **acción o explicación** (nada de alertas solo para llamar la atención); los avisos críticos no van en vidrio (A9.9).

### 02.7.4 Editor de estructura (`/b/[id]/settings/categories`)

- Árbol: grupos como cabeceras plegables; categorías como filas con icono, nombre, nº de movimientos, menú `⋯`.
- **Crear:** botón `+ Grupo` al final; `+ Categoría` en cada grupo; entrada en línea (Enter guarda, Esc cancela, validación en vivo del duplicado).
- **Renombrar:** doble clic o `F2`.
- **Reordenar:** arrastre (`dnd-kit`) con **alternativa por teclado** (`Alt+↑/↓` y botones "Subir/Bajar" con `aria-label`), y anuncio `aria-live` ("Comida movida a posición 2 en Vida diaria"). Al soltar → `reorderCategories`; si responde `CONFLICT_VERSION` la UI recarga el árbol.
- **Ocultas:** sección plegada "Ocultas (n)" con "Mostrar".
- **`⋯` categoría:** Ocultar · Icono/Color · Nota · Archivar… · Fusionar en…
- **Fusionar:** modal con selector de destino → vista previa ("Se moverán 42 transacciones y Bs 320 asignados. Por asignar histórico cambia en 2 meses") → botón "Fusionar" (deshabilitado hasta ver la vista previa).
- **Archivar:** si hay disponible >0 → "Mover Bs X a: [Por asignar ▾]".
- Sistema: fila con 🔒 y tooltip "Categoría del sistema".
- Estado vacío: "Sin categorías. Usa una plantilla" con botones de plantilla (agrega, no reemplaza).

### 02.7.5 Ajustes generales del presupuesto
Nombre, moneda (solo lectura + explicación cuando hay datos), zona horaria, interruptor "Impedir asignar más de lo disponible" (`strict_budgeting`, explicación breve), Duplicar estructura, Archivar, **Zona de peligro** → Eliminar (`ConfirmDialog` con nombre).

## 02.8 Casos borde

- Dos usuarios reordenan a la vez → el segundo recibe `CONFLICT_VERSION` y ve el árbol actualizado.
- Crear categoría con el nombre de una archivada → permitido (unicidad solo entre activas).
- Archivar grupo con categorías ocultas con dinero → bloqueado hasta resolver cada una.
- Plantilla con nombres ya existentes (agregar plantilla a presupuesto existente) → sufijo " (2)" solo si colisiona.
- Emoji en el nombre: permitido; la búsqueda ignora emojis y tildes.
- 200 categorías: el editor virtualiza la lista y el drag sigue fluido.
- Moneda distinta a la del perfil → informativo, sin bloqueo.
- Presupuesto eliminado abierto en otra pestaña → 404 amigable "Este presupuesto fue eliminado (puede restaurarlo el propietario)".

## 02.9 Criterios de aceptación

```text
AC-BUD-01  Given usuario verificado
           When crea un presupuesto con plantilla "Básico"
           Then existen 3 grupos con 9 categorías + inflow_rta oculta, el usuario es OWNER y last_budget_id apunta a él (una sola transacción).

AC-BUD-02  Given un presupuesto con una cuenta
           When intenta cambiar la moneda
           Then recibe VALIDATION_FAILED con explicación y el campo aparece deshabilitado en la UI.

AC-BUD-03  Given un VIEWER
           When intenta crear una categoría (UI o API)
           Then la UI oculta la acción y la API responde PERMISSION_DENIED.

AC-BUD-04  Given categorías [A,B,C]
           When se reordenan a [C,A,B] con reorderCategories
           Then positions = C:0,A:1,B:2 y el orden persiste tras recargar.

AC-BUD-05  Given una categoría con Bs 50 disponibles
           When se archiva eligiendo "Mover a Por asignar"
           Then su disponible actual = 0, Por asignar aumenta Bs 50 y existe un budget_movements + audit.

AC-BUD-06  Given una categoría de sistema
           When se intenta renombrar o archivar
           Then CATEGORY_SYSTEM_PROTECTED.

AC-BUD-07  Given fusión A→B con transacciones y asignaciones
           When se confirma con el hash de la vista previa
           Then todas las líneas pasan a B, assigned(B,mes)=assigned(A,mes)+assigned(B,mes), A queda archivada.

AC-BUD-08  Given Inicio sin specs 03+ desplegadas
           When se carga
           Then solo aparecen widgets con datos no nulos y el estado vacío guiado.

AC-BUD-09  Given un usuario A
           When pide categorías del presupuesto de B por API
           Then NOT_FOUND (no revela existencia).
```

## 02.10 Tests requeridos

- **Unit:** `reorderPositions(current, ordered)`, `validateName`, `applyTemplate(template, existing)`, `sortAttentionItems`.
- **Property:** cualquier secuencia de reordenamientos deja `position` denso y sin duplicados.
- **Integración:** `createBudget` atómico (fallo a mitad ⇒ nada persiste), constraint `categories_inflow_uq`, FK compuestas rechazan cruzar presupuestos, RLS por rol.
- **E2E:** Journey 1 (crear presupuesto), reordenar por teclado, archivar con movimiento, fusionar.

## 02.12 No hacer

🟥 `ON DELETE CASCADE` desde categorías hacia transacciones · 🟥 borrar físicamente categorías/presupuestos con historial · 🟥 guardar `available` o `activity` en `category_months` · 🟥 renumerar posiciones con `+1/-1` ad hoc (usar el reindexado en bloque) · 🟥 hex de color libre en categorías · 🟥 tratar `inflow_rta` como caso especial en código en vez de fila real · 🟥 calcular Por asignar en el componente del Inicio.

---
