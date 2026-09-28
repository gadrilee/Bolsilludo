# PLAN MAESTRO DE IMPLEMENTACIÓN — BOLSILLUDO
## Plataforma de presupuesto, patrimonio y automatización financiera inspirada en YNAB

> **Objetivo:** construir desde cero una aplicación web/móvil de finanzas personales y gestión patrimonial que reproduzca aproximadamente el 50% de las capacidades esenciales de un sistema como YNAB y utilice el otro 50% del producto para resolver casos de uso independientes, UX moderna, automatización, IA, metas avanzadas, multi-divisa, gastos compartidos y herramientas patrimoniales.
>
> **Metodología de desarrollo:** Spec-Driven Development con Spec Kit.
>
> **Fecha objetivo de referencia:** 2026.
>
> **Principio central:** no copiar la interfaz de YNAB; implementar los comportamientos financieros fundamentales y diseñar una experiencia de interacción propia, más directa, explicable y de baja fricción.

---

# 0. RESUMEN EJECUTIVO

## 0.1 Visión del producto

La aplicación (**Bolsilludo**) debe funcionar como un **sistema operativo financiero personal**:

1. El usuario conecta sus cuentas o registra movimientos manualmente.
2. El sistema normaliza todas las transacciones.
3. El usuario decide qué dinero está disponible y qué trabajo tendrá.
4. El sistema calcula automáticamente:
   - dinero disponible para asignar,
   - presupuesto por categoría,
   - gasto acumulado,
   - dinero restante,
   - objetivos,
   - obligaciones futuras,
   - tarjetas de crédito,
   - patrimonio,
   - flujo de caja,
   - alertas.
5. La interfaz debe priorizar **acciones**, no tablas:
   - “Tienes 720 para asignar”.
   - “Necesitas 180 más para cubrir tus próximos 14 días”.
   - “Tu tarjeta tiene 96 disponibles para pagar”.
   - “Tu objetivo de emergencia está 27% completo”.
6. La IA debe ser un **copiloto controlado**, nunca un agente financiero con capacidad de mover dinero sin autorización explícita.
7. El sistema debe conservar un historial auditable de cambios financieros.

---

# 0.5 IDENTIDAD DE MARCA Y DESIGN TOKENS — BOLSILLUDO

## 0.5.1 Nombre y logo

```text
Nombre visible:   Bolsilludo
Slug técnico:     bolsilludo
Scope paquetes:   @bolsilludo/*
Repo:             bolsilludo/
"Finance OS":     categoría interna del producto, NO el nombre visible
```

Logo (concepto 3, fondo transparente): letra **B** en degradado esmeralda con un
**bolsillo** oscuro que sostiene una **moneda dorada**.

Reglas:

- El archivo actual (`concepto_3_sin_fondo.png`, 260×322 px) es solo referencia.
  Debe rehacerse como **SVG vectorial** usando los tokens exactos de la paleta
  (la moneda del PNG es aprox. `#F8B21E`, no `#F4C13A`).
- Variantes obligatorias: color completo, monocromo blanco, monocromo azul oscuro,
  ícono de app (maskable/PWA) y favicon.
- Verificar legibilidad sobre fondo azul oscuro y sobre fondo claro.
- Guardar en `specs/00b-design-system/brand/`.

## 0.5.2 Paleta oficial

| Token | Hex | Rol |
|---|---|---|
| `--bol-navy-900` | `#0B2046` | Fondo profundo (tema oscuro), texto principal (tema claro) |
| `--bol-emerald-500` | `#16B78C` | Primario brillante: acciones, positivo, foco, progreso |
| `--bol-green-700` | `#0B7A5A` | Primario oscuro: hover/pressed, texto y links en tema claro |
| `--bol-gold-400` | `#F4C13A` | Acento: metas, moneda, logros, atención positiva |

Tonos derivados (permitidos, salen de la paleta):

```text
--bol-emerald-300  #5AEFBD   highlight del degradado del logo
--bol-navy-800     #12305F   superficie elevada sobre navy-900
--bol-navy-700     #1B3F73   bordes / divisores en oscuro
--bol-ink-muted    #A9B8D3   texto secundario en oscuro   (8.01:1 sobre navy-900)
--bol-ink-muted-l  #4B5D7E   texto secundario en claro    (6.63:1 sobre blanco)
--bol-gold-700     #7A5800   texto dorado sobre fondo claro (6.51:1 sobre blanco)
```

### Colores semánticos (PROPUESTA — requiere aprobación del dueño)

La paleta no incluye un color de peligro y el plan usa 🔴 para sobregasto y
tarjetas por cubrir. Se propone:

```text
--bol-danger-l  #C62F35   sobre claro   (5.44:1 sobre blanco)
--bol-danger-d  #FF6B70   sobre oscuro  (5.80:1 sobre navy-900)
```

Mapeo de los indicadores del plan:

```text
🔴 crítico      → danger
🟠 atención     → gold
🟢 saludable    → emerald
🔵 informativo  → navy/ink-muted
```

## 0.5.3 Contraste validado (WCAG 2.2)

| Combinación | Ratio | Uso permitido |
|---|---:|---|
| Blanco sobre `#0B2046` | 16.04 | Todo texto |
| `#16B78C` sobre `#0B2046` | 6.25 | Texto e íconos en oscuro |
| `#F4C13A` sobre `#0B2046` | 9.57 | Texto e íconos en oscuro |
| `#0B2046` sobre `#16B78C` | 6.25 | **Texto de botón primario** |
| `#0B2046` sobre `#F4C13A` | 9.57 | Texto sobre chips/botones dorados |
| `#0B7A5A` sobre blanco | 5.32 | Texto y links en claro |
| Blanco sobre `#0B7A5A` | 5.32 | Botón primario oscuro |
| `#16B78C` sobre blanco | **2.57** ❌ | Solo relleno decorativo, nunca texto ni borde funcional |
| `#F4C13A` sobre blanco | **1.68** ❌ | Nunca como texto/ícono en claro |
| Blanco sobre `#16B78C` | **2.57** ❌ | Prohibido |
| `#0B7A5A` sobre `#0B2046` | **3.01** ⚠️ | Solo decorativo / texto grande |

Reglas derivadas:

1. Botón primario con fondo esmeralda lleva **texto azul oscuro**, no blanco.
2. En tema claro, texto/links verdes usan `green-700`, no `emerald-500`.
3. El dorado en tema claro solo como relleno con texto azul oscuro, o `gold-700` para texto.
4. Sobre superficies de vidrio, el contraste se mide contra el **peor fondo posible**;
   si no cumple, se añade scrim opaco detrás del texto.
5. Un test automático de contraste corre en CI sobre todos los pares de tokens.

## 0.5.4 Tokens (fuente única)

```css
:root {
  /* marca */
  --bol-navy-900:#0B2046; --bol-emerald-500:#16B78C;
  --bol-green-700:#0B7A5A; --bol-gold-400:#F4C13A;

  /* semánticos — TEMA OSCURO (por defecto) */
  --bg:            var(--bol-navy-900);
  --surface-1:     #12305F;
  --text:          #FFFFFF;
  --text-muted:    #A9B8D3;
  --primary:       var(--bol-emerald-500);
  --on-primary:    var(--bol-navy-900);
  --accent:        var(--bol-gold-400);
  --danger:        #FF6B70;

  /* vidrio */
  --glass-bg:      rgba(255,255,255,.08);
  --glass-border:  rgba(255,255,255,.18);
  --glass-blur:    20px;

  /* profundidad */
  --z-1: 0;  --z-2: 10;  --z-3: 20;  --z-4: 30;
}
:root[data-theme="light"] {
  --bg:#F6F8FB; --surface-1:#FFFFFF;
  --text:#0B2046; --text-muted:#4B5D7E;
  --primary:#0B7A5A; --on-primary:#FFFFFF;
  --accent:#7A5800; --danger:#C62F35;
  --glass-bg:rgba(255,255,255,.62); --glass-border:rgba(11,32,70,.12);
}
```

Tema: **oscuro por defecto** (refleja la marca) y **claro completo**. Ambos son obligatorios.

---

---

# 1. OBJETIVO 50/50

## 1.1 Mitad A — 50%: cobertura del modelo YNAB

Esta mitad debe cubrir la mayoría de los conceptos que hacen reconocible un sistema de presupuesto de sobres/base cero:

| Área | Cobertura objetivo |
|---|---:|
| Presupuesto base cero | 100% |
| Categorías / grupos | 100% |
| Rollover | 100% |
| Ingresos | 100% |
| Cuentas | 100% |
| Transacciones | 100% |
| Split transactions | 100% |
| Transferencias | 100% |
| Payees | 100% |
| Transacciones programadas | 100% |
| Conciliación | 100% |
| Importación CSV | 100% |
| Importación OFX/QFX | 100% |
| Sync bancaria | MVP / adapter-ready |
| Tarjetas de crédito | 100% |
| Overspending | 100% |
| Metas básicas | 100% |
| Net Worth | 100% |
| Income vs Expense | 100% |
| Spending reports | 100% |
| Presupuestos múltiples | 100% |
| Compartición de presupuesto | 100% |
| Mobile quick entry | 100% |
| API interna | 100% |

### Principio

La implementación no intentará replicar detalles privados de YNAB que no sean observables o documentados. Cuando una lógica externa no sea conocida, se implementará un comportamiento financiero equivalente y documentado en nuestro producto.

---

## 1.2 Mitad B — 50%: diferenciación

El segundo bloque convierte el proyecto en un producto propio.

| Área | Objetivo |
|---|---|
| UX Action-First | Reducir clics |
| Dashboard adaptable | Ver lo importante primero |
| Goals avanzados | Metas con dependencias y escenarios |
| Multi-divisa nativa | Cuentas y patrimonio en varias monedas |
| Split de gastos grupales | Amigos / pareja / familia |
| IA categorizadora | Clasificación automática |
| IA de anomalías | Detección de gastos inusuales |
| IA de planificación | Sugerencias de presupuesto |
| Recibos OCR | Crear transacción desde foto |
| Automatizaciones | Reglas del usuario |
| Finanzas patrimoniales | Activos, inversiones y deuda |
| Debt planner | Amortización y escenarios |
| Net Worth avanzado | Patrimonio líquido y total |
| Simulador “What if” | Escenarios |
| Gamificación | Hábitos y objetivos |
| Offline-first | Captura sin internet |
| Centro de decisiones | Alertas agrupadas por prioridad |
| Seguridad | Audit trail y controles de IA |
| Integraciones futuras | Open Finance / webhooks / API |

---

# 2. REGLA FUNDAMENTAL DEL PROYECTO

No implementar todo simultáneamente.

El sistema utilizará:

```text
ROADMAP
   |
   +-- FOUNDATION
   |
   +-- SPEC 01 Identity
   +-- SPEC 02 Budgets
   +-- SPEC 03 Accounts
   +-- SPEC 04 Transactions
   +-- SPEC 05 Budget Engine
   +-- SPEC 06 Goals
   +-- SPEC 07 Credit Cards
   +-- SPEC 08 Reconciliation
   +-- SPEC 09 Imports
   +-- SPEC 10 Scheduled Transactions
   +-- SPEC 11 Reports
   +-- SPEC 12 Collaboration
   |
   +-- DIFFERENTIATION
   +-- SPEC 13 Multi Currency
   +-- SPEC 14 Shared Expenses
   +-- SPEC 15 Advanced Goals
   +-- SPEC 16 Automations
   +-- SPEC 17 AI Categorization
   +-- SPEC 18 Receipt OCR
   +-- SPEC 19 AI Finance Copilot
   +-- SPEC 20 Net Worth / Assets
   +-- SPEC 21 Debt Planner
   +-- SPEC 22 Gamification
   +-- SPEC 23 Offline
   +-- SPEC 24 Advanced Analytics
   |
   +-- HARDENING
       + Security
       + Observability
       + Performance
       + Accessibility
       + Mobile
       + Backup / Recovery
```

Este enfoque coincide con el concepto de **“spec of specs”** de Spec Kit: cuando una funcionalidad o producto es demasiado grande para una sola especificación, se divide en sub-features independientes, cada una con su propio `spec.md`, `plan.md` y `tasks.md`.

---

# 3. METODOLOGÍA SPEC KIT

## 3.1 Flujo oficial recomendado

La secuencia base será:

```text
/speckit.constitution
        ↓
ROADMAP / SPEC OF SPECS
        ↓
/speckit.specify
        ↓
/speckit.clarify
        ↓
/speckit.plan
        ↓
/speckit.checklist
        ↓
/speckit.tasks
        ↓
/speckit.analyze
        ↓
/speckit.implement
        ↓
/speckit.converge
```

Spec Kit documenta este ciclo y recomienda volver a ejecutar `implement → converge` hasta que la funcionalidad converja con la especificación. También permite usar `clarify`, `checklist` y `analyze` como controles de calidad.

---

# 4. REGLA DE ORO PARA LAS ESPECIFICACIONES

Cada feature debe responder:

### WHAT

- ¿Qué puede hacer el usuario?
- ¿Qué problema resuelve?
- ¿Qué datos necesita?
- ¿Qué estados existen?
- ¿Qué pasa cuando algo falla?
- ¿Qué casos de borde existen?

### WHY

- ¿Por qué existe?
- ¿Qué métrica UX mejora?
- ¿Qué riesgo evita?

### HOW

Solo después:

- stack;
- tablas;
- endpoints;
- servicios;
- componentes;
- jobs;
- tests.

La especificación no debe mezclar prematuramente decisiones de implementación con comportamiento de producto.

---

# 5. ESTRUCTURA DEL REPOSITORIO

Se recomienda:

```text
bolsilludo/
│
├── .specify/
│   ├── memory/
│   │   └── constitution.md
│   ├── templates/
│   └── scripts/
│
├── specs/
│   ├── 00-roadmap/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   ├── tasks.md
│   │   ├── architecture.md
│   │   └── traceability.md
│   │
│   ├── 00b-design-system/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   ├── tasks.md
│   │   └── brand/            # logo SVG, tokens.json, guía de uso
│   ├── 01-identity/
│   ├── 02-workspaces-budgets/
│   ├── 03-accounts/
│   ├── 04-transactions/
│   ├── 05-budget-engine/
│   ├── 06-goals/
│   ├── 07-credit-cards/
│   ├── 08-reconciliation/
│   ├── 09-imports/
│   ├── 10-scheduled-transactions/
│   ├── 11-reports/
│   ├── 12-collaboration/
│   ├── 13-multi-currency/
│   ├── 14-shared-expenses/
│   ├── 15-advanced-goals/
│   ├── 16-automations/
│   ├── 17-ai-categorization/
│   ├── 18-receipt-ocr/
│   ├── 19-ai-copilot/
│   ├── 20-net-worth-assets/
│   ├── 21-debt-planner/
│   ├── 22-gamification/
│   ├── 23-offline/
│   ├── 24-analytics/
│   └── 25-platform-ux/
│
├── apps/
│   ├── web/
│   ├── mobile/
│   └── admin/
│
├── packages/
│   ├── domain/
│   ├── money/
│   ├── budget-engine/
│   ├── transaction-engine/
│   ├── reports/
│   ├── validation/
│   ├── db/
│   ├── design-tokens/
│   ├── ui/
│   ├── ai/
│   └── config/
│
├── services/
│   ├── banking/
│   ├── imports/
│   ├── notifications/
│   ├── ai/
│   └── jobs/
│
├── docs/
│   ├── ADR/
│   ├── api/
│   ├── domain/
│   └── diagrams/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── contract/
│   ├── e2e/
│   └── property/
│
└── README.md
```

---

# 6. CONSTITUTION DEL PROYECTO

El primer comando de Spec Kit debe crear una Constitución estable.

## Principios obligatorios

### P1 — Financial Correctness First

Toda lógica monetaria debe priorizar la exactitud sobre conveniencia visual.

### P2 — Integer Money

Nunca usar `float` para almacenar dinero.

Usar:

```text
amount_minor INTEGER/BIGINT
currency CHAR(3)
```

Ejemplos:

```text
10.25 USD → 1025
50.00 BOB → 5000
```

Para monedas con diferente precisión, el sistema debe obtener la precisión desde `currencies`.

### P3 — Immutable Financial History

Una transacción confirmada nunca se “borra físicamente”.

Se utiliza:

```text
voided_at
voided_by
void_reason
```

o eventos compensatorios.

### P4 — Double-Entry Where Appropriate

Las operaciones que afectan dos cuentas deben mantener equilibrio lógico.

### P5 — Deterministic Budget Engine

Dado el mismo:

```text
starting state
+
transactions
+
allocations
+
goals
```

el resultado debe ser idéntico.

### P6 — Explainability

Toda recomendación automática debe poder explicar:

```text
qué observó
+
qué regla aplicó
+
qué propone
+
qué impacto tendría
```

### P7 — Human Approval

La IA no puede:

- transferir dinero real;
- realizar pagos;
- modificar cuentas bancarias;
- aceptar deuda;
- vender activos;

sin autorización explícita.

### P8 — Privacy by Design

Los datos financieros son extremadamente sensibles.

### P9 — Offline Friendly

Registrar una compra debe ser posible sin internet.

### P10 — Accessibility

WCAG 2.2 AA como objetivo.

### P11 — Mobile First

La transacción rápida debe poder registrarse en menos de 10 segundos.

### P12 — No Spreadsheet Dependency

La tabla existe para precisión, no como interfaz principal.

### P13 — Brand & Tokens Single Source

Colores, radios, sombras, blur y motion viven SOLO en `packages/design-tokens`.
Prohibido hardcodear hex/px de marca en componentes (lint + test). Ver sección 0.5.

### P14 — Universal CalcInput

Todo campo que capture un monto o cantidad usa `CalcInput` (calculadora integrada
con `+ - × ÷` y cálculo directo). Ver sección 58B.

### P15 — Agentic UX Under Human Control

La IA propone, explica y espera aprobación; todo efecto es reversible y auditable.
La app debe funcionar completa sin IA. Ver sección 58A (extiende P6 y P7).

---

# 7. FASES MAESTRAS

## FASE 0 — Discovery + Constitution

### Resultado

```text
constitution.md
roadmap/spec.md
architecture.md
glossary.md
```

### Duración objetivo

1 ciclo Spec Kit.

### Exit Criteria

- dominio definido;
- glosario aprobado;
- invariantes documentadas;
- stack definido;
- scope 50/50 definido.

---

# 8. FASE 1 — FOUNDATION

## Objetivo

Preparar la infraestructura que todas las demás features necesitan.

### Componentes

- monorepo;
- TypeScript;
- Next.js;
- Supabase/PostgreSQL;
- Drizzle ORM;
- migrations;
- authentication;
- environment management;
- validation;
- logging;
- error handling;
- test framework;
- CI;
- code formatting;
- lint;
- database seed.

### Stack recomendado

```text
Frontend:
Next.js
React
TypeScript
Tailwind
shadcn/ui
Framer Motion

Backend:
Next.js server actions / route handlers
or dedicated API layer

DB:
PostgreSQL
Supabase

ORM:
Drizzle ORM

Auth:
Supabase Auth
or Auth.js

Validation:
Zod

Testing:
Vitest
Playwright

Jobs:
Trigger.dev
or Supabase scheduled functions
or queue compatible

Storage:
Supabase Storage

Observability:
Sentry
OpenTelemetry

AI:
Provider adapter
```

---

# 9. DATA MODEL MAESTRO

## 9.1 Identity

```text
users
profiles
sessions
devices
```

## 9.2 Budget

```text
budgets
budget_members
budget_settings

category_groups
categories
category_months
category_allocations
```

## 9.3 Accounts

```text
accounts
account_balances
account_connections
```

## 9.4 Transactions

```text
transactions
transaction_splits
transaction_links
payees
transaction_imports
transaction_matches
```

## 9.5 Planning

```text
goals
goal_contributions
scheduled_transactions
rules
```

## 9.6 Banking

```text
bank_connections
bank_institutions
bank_accounts
bank_transactions
sync_cursors
```

## 9.7 Reconciliation

```text
reconciliations
reconciliation_items
```

## 9.8 Multi-currency

```text
currencies
exchange_rates
fx_snapshots
```

## 9.9 Collaboration

```text
budget_members
shared_expense_groups
shared_expenses
settlements
```

## 9.10 Wealth

```text
assets
asset_valuations
liabilities
net_worth_snapshots
```

## 9.11 AI

```text
ai_suggestions
ai_classifications
ai_feedback
ai_runs
ai_actions
```

## 9.12 Audit

```text
audit_events
```

---

# 10. RELACIONES PRINCIPALES

```text
USER
 |
 +----< BUDGET_MEMBER >---- BUDGET
                               |
                +--------------+--------------+
                |              |              |
              ACCOUNT      CATEGORY_GROUP    PAYEE
                |              |
                |            CATEGORY
                |              |
                |             GOAL
                |
           TRANSACTION
             /      \
            /        \
        SPLITS     TRANSFER
```

Cardinalidades:

```text
User 1:N Budget
User N:M Budget through BudgetMember

Budget 1:N Account
Budget 1:N CategoryGroup
CategoryGroup 1:N Category
Category 1:N GoalHistory / Goal

Account 1:N Transaction
Transaction 1:N TransactionSplit

Account 1:N ScheduledTransaction
Budget 1:N Payee

Transaction N:1 Payee
Transaction N:1 Category
```

---

# 11. INVARIANTES DE BASE DE DATOS

Estas reglas deben existir tanto en código como en tests.

## I1 — Split total

```text
SUM(transaction_splits.amount)
=
transaction.amount
```

## I2 — Transfer equivalence

Para una transferencia:

```text
outflow(account_A)
+
inflow(account_B)
=
0
```

En términos absolutos:

```text
ABS(outflow) = ABS(inflow)
```

## I3 — Account balance

```text
account_balance
=
opening_balance
+
SUM(posted_transactions)
```

## I4 — Category available

Modelo:

```text
available_end_month
=
available_start_month
+
assigned
+
activity
+
transfers_in
-
transfers_out
+
rollover
```

Según el modelo elegido, `rollover` puede estar materializado o ser derivado.

## I5 — Ready to Assign / To Be Budgeted

La aplicación debe definir un único estado canónico de dinero disponible para asignar.

Conceptualmente:

```text
RTA
=
cash_available
-
already_assigned
-
committed_outflows
```

La fórmula exacta debe fijarse en `specs/05-budget-engine/spec.md` y no cambiar arbitrariamente entre pantallas.

## I6 — Reconciliation

Cuando una cuenta está reconciliada:

```text
sum(ledger)
=
reported_bank_balance
```

o debe existir una diferencia explícitamente registrada.

## I7 — Currency isolation

Nunca sumar directamente:

```text
USD + BOB
```

sin conversión explícita.

---

# 12. FASE 2 — IDENTITY

## SPEC 01 — Identity & Profiles

### Objetivo

Implementar:

- registro;
- login;
- logout;
- reset password;
- email verification;
- perfil;
- timezone;
- locale;
- moneda principal;
- preferences.

### User Stories

#### US1

Como usuario quiero crear una cuenta.

#### US2

Como usuario quiero iniciar sesión.

#### US3

Como usuario quiero recuperar mi acceso.

#### US4

Como usuario quiero definir moneda y zona horaria.

### Acceptance Criteria

```text
Given user has valid credentials
When login succeeds
Then session is created.

Given invalid credentials
Then no sensitive authentication detail is exposed.

Given a verified user
Then they can create their first budget.
```

---

# 13. FASE 3 — BUDGETS & WORKSPACES

## SPEC 02 — Budgets

### Funcionalidades

- crear presupuesto;
- renombrar;
- archivar;
- duplicar estructura;
- eliminar;
- cambiar moneda base;
- múltiples presupuestos;
- presupuesto compartido.

### Modelo

```text
Budget
 ├─ Settings
 ├─ Members
 ├─ Accounts
 ├─ CategoryGroups
 ├─ Categories
 └─ Transactions
```

### Dashboard inicial

No mostrar primero una tabla.

Mostrar:

```text
TOTAL DISPONIBLE
$ 1,850

PARA ASIGNAR
$ 720

PRÓXIMOS 30 DÍAS
$ 960

METAS
3 en progreso

ALERTAS
2
```

---

# 14. FASE 4 — CATEGORIES

## SPEC 03 — Category System

### Funciones

- crear group;
- crear category;
- mover category;
- ordenar;
- ocultar;
- archivar;
- renombrar;
- iconos;
- colores;
- reglas;
- objetivo asociado.

### Estructura

```text
GASTOS FIJOS
 ├─ Alquiler
 ├─ Internet
 └─ Electricidad

VIDA DIARIA
 ├─ Comida
 ├─ Transporte
 └─ Entretenimiento

OBJETIVOS
 ├─ Fondo emergencia
 ├─ Vacaciones
 └─ Equipo
```

---

# 15. FASE 5 — ACCOUNT ENGINE

## SPEC 04 — Accounts

### Tipos mínimos

```text
CHECKING
SAVINGS
CASH
CREDIT_CARD
LOAN
INVESTMENT
OTHER_ASSET
OTHER_LIABILITY
```

### Campos

```text
id
budget_id
name
type
currency
opening_balance
current_balance
cleared_balance
reconciled_balance
closed_at
is_on_budget
institution_id
external_account_id
```

### Reglas

- una cuenta debe pertenecer a un budget;
- una cuenta solo usa una moneda operacional;
- una cuenta puede tener conexión bancaria;
- cerrar una cuenta no elimina histórico.

---

# 16. FASE 6 — TRANSACTION ENGINE

## SPEC 05 — Transactions

### Transacción base

```text
id
budget_id
account_id
date
payee_id
amount_minor
currency
memo
status
cleared_at
reconciled_at
import_id
external_id
created_by
created_at
updated_at
```

### Estados

```text
PENDING
CLEARED
RECONCILED
VOIDED
```

### Operaciones

- create;
- edit;
- void;
- duplicate;
- match;
- split;
- transfer;
- refund;
- import.

---

# 17. SPLIT TRANSACTIONS

## Regla

Una transacción madre:

```text
-150
```

puede dividirse:

```text
Comida       -100
Limpieza      -30
Hogar         -20
```

Siempre:

```text
-100 - 30 - 20 = -150
```

### UX

No abrir otra página.

Utilizar drawer/modal:

```text
Compra Supermercado
$150

[ Comida      $100 ]
[ Limpieza     $30 ]
[ Hogar        $20 ]

-------------------
TOTAL          $150

[Guardar]
```

### Validación

No permitir guardar si:

```text
sum(split) != transaction.amount
```

---

# 18. TRANSFERS

## Diseño

No almacenar solamente un campo:

```text
to_account_id
```

como lógica primaria.

Crear una pareja enlazada:

```text
transaction A
transaction B
```

con:

```text
transfer_group_id
```

Ejemplo:

```text
Cuenta A
-500 BOB

Cuenta B
+500 BOB
```

### Invariantes

```text
A.transfer_group_id = B.transfer_group_id
ABS(A.amount) = ABS(B.amount)
```

### UX

El usuario realiza:

```text
Transferir
De: Banco Principal
A: Ahorros
Monto: 500
```

El sistema genera ambos movimientos.

---

# 19. FASE 7 — ZERO-BASED BUDGET ENGINE

## SPEC 06 — Budget Engine

Esta es una de las features más críticas.

## 19.1 Concepto

El sistema asigna dinero disponible a trabajos.

Ejemplo:

```text
Ingresos disponibles
        3,500

Renta
      -1,000

Comida
        -600

Transporte
        -300

Ahorro
        -500

Otros
        -400

-----------------
Por asignar
        700
```

El usuario puede ver:

```text
$700 por asignar
```

---

# 20. MODELO MENSUAL

Cada categoría necesita un estado mensual.

Tabla conceptual:

```text
category_months
```

Campos:

```text
id
category_id
month
assigned_minor
activity_minor
available_minor
goal_target_minor
goal_required_minor
```

### Fórmula base

```text
available =
previous_available
+ assigned
+ category_activity
```

Donde:

- gasto = activity negativo;
- ingreso directo a categoría = positivo;
- ajustes = delta;
- rollover = previous_available.

---

# 21. MONTH ROLLOVER

Ejemplo:

### Enero

```text
Comida:
Asignado 500
Gastado 400
Disponible 100
```

### Febrero

```text
Saldo inicial = 100
Nueva asignación = 500
Disponible = 600
```

Nunca “desaparece” el dinero sobrante.

---

# 22. FUTURE MONTHS

El sistema debe permitir navegar:

```text
Septiembre
Octubre
Noviembre
Diciembre
```

Pero no debe permitir gastar dinero inexistente.

### Regla

Un presupuesto futuro no crea dinero.

Debe existir fuente financiera o una asignación explícita.

---

# 23. OVERSPENDING

Existen dos categorías de comportamiento:

## Cash overspending

Ejemplo:

```text
Comida disponible = 20
Compra = 50
```

Resultado:

```text
Comida = -30
```

El sistema genera:

```text
ALERTA
Necesitas cubrir 30
```

## Credit overspending

Ejemplo:

```text
Tarjeta
Compra = 100
Categoría tenía = 50
```

El sistema debe registrar:

```text
50 respaldado por presupuesto
50 no respaldado
```

Esto debe alimentar el estado de la categoría de pago de tarjeta.

---

# 24. FASE 8 — GOALS

## SPEC 07 — Goals V1

Debe soportar:

### G1 — Needed for Spending

Ejemplo:

```text
Seguro anual
Objetivo:
1,200
Fecha:
12 meses
```

Motor:

```text
remaining = target - available
required = remaining / periods_remaining
```

Con reglas adicionales de rollover.

---

### G2 — Target Savings Balance

Ejemplo:

```text
Fondo emergencia
Target = 10,000
Fecha = 2027-12-31
```

---

### G3 — Monthly Builder

```text
Ahorro mensual = 300
```

### G4 — Target Without Date

```text
Meta = 5,000
Sin fecha
```

### G5 — Recurrent Obligation

```text
Suscripción
29.99 mensual
```

---

# 25. GOALS V2 — DIFERENCIACIÓN

Esto pertenece al 50% independiente.

## Nuevos tipos

### Goal hierarchy

```text
Viaje
 ├─ Hotel
 ├─ Vuelos
 └─ Comida
```

### Conditional goals

```text
Si ahorro > 5,000
entonces aumentar inversión
```

### Milestone goals

```text
25%
50%
75%
100%
```

### Goal dependencies

```text
Emergency Fund
        ↓
Debt Extra Payment
        ↓
Investment
```

---

# 26. GOAL SCENARIOS

Permitir:

```text
What if ahorro +100/mes?
```

Mostrar:

```text
Actual:
18 meses

Con +100:
11 meses

Con +200:
8 meses
```

Esto NO modifica presupuesto hasta confirmar.

---

# 27. FASE 9 — CREDIT CARDS

## SPEC 08

La tarjeta tiene que tener un motor separado de reglas.

### Cuenta

```text
type = CREDIT_CARD
```

### Gasto

```text
Cuenta CC
-100
```

### Categoría

```text
Comida
-100
```

### Budget effect

```text
Comida available -= 100
CC Payment Available += 100
```

si el gasto está respaldado por presupuesto.

---

# 28. CREDIT CARD PAYMENT CATEGORY

El sistema debe representar claramente:

```text
Tarjeta Visa
Disponible para pagar
$850

Saldo real tarjeta
$850

Estado:
100% cubierto
```

o:

```text
Disponible para pagar
$600

Saldo real
$850

Déficit
$250
```

### UX

No obligar al usuario a interpretar varias columnas para entender esta situación.

---

# 29. CREDIT CARD FLOAT

El sistema debe detectar:

```text
card_balance > money_reserved_for_payment
```

y mostrar:

```text
Tu tarjeta tiene $250 de gasto no cubierto.
Esto significa que parte del saldo se está financiando.
```

Nunca debe mostrarse una falsa sensación de “todo bien”.

---

# 30. REFUNDS

## Refund de compra normal

Si:

```text
Compra = -100
Refund = +100
```

la categoría recupera:

```text
+100
```

si la política seleccionada es:

```text
Return to original category
```

Opcional:

```text
Ready to Assign
```

---

# 31. FASE 10 — RECONCILIATION

## SPEC 09

### Flujo

```text
1. Seleccionar cuenta
2. Confirmar saldo banco
3. Sistema muestra saldo interno
4. Calcula diferencia
5. Usuario revisa transacciones
6. Marca como reconciliadas
7. Registra snapshot
```

### Fórmula

```text
difference =
bank_balance
-
ledger_balance
```

Si:

```text
difference = 0
```

entonces:

```text
RECONCILED
```

### Si no coincide

Mostrar:

```text
Faltan: 2 transacciones
Posible duplicado: 1
Diferencia: 37.50
```

---

# 32. RECONCILIATION ASSISTANT

Feature diferenciadora.

El sistema analiza:

- misma cantidad;
- fechas cercanas;
- merchant parecido;
- external id;
- monto exacto;
- descripción similar.

Y muestra:

```text
Posible coincidencia

Banco:
Starbucks
-12.50
12 Sep

YNAB-like ledger:
Starbucks
-12.50
12 Sep

[Coincide] [No coincide]
```

---

# 33. FASE 11 — BANK IMPORT

## SPEC 10

### V1

```text
CSV
```

### V2

```text
OFX
QFX
```

### V3

Provider abstraction:

```text
BankProvider
 ├─ PlaidAdapter
 ├─ TrueLayerAdapter
 ├─ OpenBankingAdapter
 └─ ManualAdapter
```

No acoplar el core del presupuesto a Plaid.

---

# 34. BANK SYNC PIPELINE

```text
BANK
  ↓
Provider API
  ↓
Raw payload
  ↓
Normalizer
  ↓
Deduplicator
  ↓
Matcher
  ↓
Pending transactions
  ↓
User confirmation
  ↓
Ledger
```

### Raw storage

Guardar payload original en forma segura para debugging y auditoría, con retención definida.

---

# 35. DUPLICATE DETECTION

Fingerprint:

```text
hash(
 account_id
 +
 provider_transaction_id
 +
 date
 +
 normalized_amount
)
```

Fallback:

```text
same account
+
same amount
+
same date ± tolerance
+
similar payee
```

---

# 36. FASE 12 — SCHEDULED TRANSACTIONS

## SPEC 11

### Frecuencias

```text
DAILY
WEEKLY
BIWEEKLY
MONTHLY
YEARLY
CUSTOM
```

### Campos

```text
frequency
next_occurrence
end_date
amount
payee
category
account
```

### Estados

```text
ACTIVE
PAUSED
COMPLETED
```

---

# 37. SMART SCHEDULE

Feature diferenciadora:

Si el sistema observa:

```text
Spotify
12.99
todos los 15
```

puede sugerir:

```text
Crear transacción recurrente?
```

pero no crearla automáticamente sin permiso.

---

# 38. FASE 13 — PAYEES & RULES

## SPEC 12

### Payee normalization

Ejemplo:

```text
WALMART #202
Walmart 202
WAL-MART
```

Normalizar a:

```text
Walmart
```

### Rules

```text
IF payee = Netflix
THEN category = Streaming
```

```text
IF amount > 500
AND payee contains "Fuel"
THEN review = true
```

---

# 39. FASE 14 — REPORTS

## SPEC 13

Reportes mínimos:

### R1 — Net Worth

```text
Assets - Liabilities
```

### R2 — Income vs Expense

```text
income
vs
expense
```

### R3 — Spending by Category

### R4 — Spending Trends

### R5 — Category Performance

### R6 — Cash Flow

### R7 — Account Balances

### R8 — Debt

### R9 — Goals

---

# 40. REPORT ENGINE

Los reportes no deben calcular todo desde componentes React.

Crear:

```text
report services
```

Ejemplo:

```text
getNetWorth(period)
getSpending(period)
getIncome(period)
getCashFlow(period)
getGoalProgress(period)
```

---

# 41. FASE 15 — COLLABORATION

## SPEC 14

### Roles

```text
OWNER
ADMIN
EDITOR
VIEWER
```

### Tabla

```text
budget_members
```

Campos:

```text
budget_id
user_id
role
invited_by
joined_at
```

### Permissions

| Acción | Owner | Admin | Editor | Viewer |
|---|---:|---:|---:|---:|
| Ver | ✓ | ✓ | ✓ | ✓ |
| Crear transacción | ✓ | ✓ | ✓ | - |
| Editar presupuesto | ✓ | ✓ | - | - |
| Invitar | ✓ | ✓ | - | - |
| Eliminar presupuesto | ✓ | - | - | - |

---

# 42. FASE 16 — MULTI-CURRENCY

## SPEC 15

### Modelo

```text
Base currency:
BOB

Account A:
BOB

Account B:
USD

Account C:
EUR
```

### Exchange rate

```text
USD -> BOB
1 USD = X BOB
```

Guardar siempre:

```text
source_currency
target_currency
rate
timestamp
provider
```

### Regla

No sobrescribir tasas históricas.

---

# 43. FX HISTÓRICO

Una transacción de 2026 debe conservar la tasa aplicada entonces.

No recalcular el pasado usando la tasa actual.

---

# 44. NET WORTH MULTI-CURRENCY

Pipeline:

```text
Account balance
       ↓
Account currency
       ↓
Historical FX
       ↓
Base currency
       ↓
Net worth
```

---

# 45. FASE 17 — SHARED EXPENSES

## SPEC 16

Inspirado conceptualmente en Splitwise, pero integrado en el presupuesto.

Ejemplo:

```text
Cena
120 USD
Pagó: Gabriel

Participantes:
Gabriel 40
Luis     40
Ana      40
```

El sistema genera:

```text
Expense group
Settlement obligations
```

---

# 46. SETTLEMENT ENGINE

Ejemplo:

```text
Gabriel owes: 0
Luis owes: 40
Ana owes: 40

Total receivable = 80
```

Al registrar:

```text
Luis paga 40
```

se crea settlement.

---

# 47. FASE 18 — ADVANCED ASSETS

## SPEC 17

Agregar:

```text
Cash
Bank
Crypto
Stocks
ETF
Vehicle
Property
Other Asset
```

### Asset valuation

```text
asset_id
valuation_date
value
currency
source
```

### Net worth

```text
sum(asset values)
-
sum(liabilities)
```

---

# 48. FASE 19 — DEBT PLANNER

## SPEC 18

Debe soportar:

```text
principal
interest_rate
minimum_payment
extra_payment
frequency
```

### Amortización

Para interés periódico:

```text
interest = principal * periodic_rate
principal_paid = payment - interest
new_principal = principal - principal_paid
```

### Escenarios

```text
minimum only
minimum + 50
minimum + 100
avalanche
snowball
```

El simulador no cambia el ledger hasta confirmar.

---

# 49. FASE 20 — AI CATEGORIZATION

## SPEC 19

### Pipeline

```text
Transaction
   ↓
Deterministic rules
   ↓
Historical match
   ↓
ML/LLM classifier
   ↓
Confidence
   ↓
User approval
   ↓
Feedback
```

### Prioridad

1. Regla exacta
2. Historial personal
3. Merchant model
4. ML
5. LLM

Nunca al revés.

---

# 50. CONFIDENCE MODEL

Ejemplo:

```text
confidence = 0.97
```

### Auto-apply threshold

```text
>= 0.98
```

### Suggestion

```text
0.75 - 0.979
```

### Human review

```text
< 0.75
```

Estos valores deben ser configurables y medirse posteriormente.

---

# 51. AI EXPLANATION

Nunca:

```text
"Categorizado automáticamente"
```

Mejor:

```text
Propongo "Comida"

Motivo:
- Este comercio se clasificó así 14 veces.
- El 93% de tus compras anteriores aquí fueron Comida.
- Importe y horario coinciden con tu patrón.

[Aceptar]
[Editar]
[Siempre usar]
```

---

# 52. FASE 21 — RECEIPT OCR

## SPEC 20

Flujo:

```text
Camera
 ↓
Image
 ↓
OCR
 ↓
Merchant extraction
 ↓
Date extraction
 ↓
Tax
 ↓
Line items
 ↓
Total
 ↓
Category suggestions
 ↓
Review
```

### No guardar imágenes innecesariamente

El usuario puede elegir:

```text
Guardar recibo
No guardar
```

---

# 53. FASE 22 — AI FINANCIAL COPILOT

## SPEC 21

El usuario puede preguntar:

```text
"¿Cuánto gasté en comida este mes?"
```

Respuesta basada en herramientas internas.

No permitir que el LLM invente números.

### Arquitectura

```text
User
 ↓
Intent parser
 ↓
Tool selection
 ↓
Financial query service
 ↓
Validated result
 ↓
LLM explanation
```

### Tools

```text
get_budget_status()
get_category_balance()
get_transactions()
get_spending_report()
get_goals()
get_net_worth()
simulate_budget()
```

---

# 54. AI ACTIONS

Ejemplo:

```text
"¿Puedes ayudarme a encontrar 200 para mi meta?"
```

El agente puede proponer:

```text
Reducir:
Entretenimiento -80
Restaurantes -70
Compras -50

Liberaría:
200
```

Pero debe terminar:

```text
[Aplicar cambios]
```

No ejecutarlos automáticamente.

---

# 55. FASE 23 — ACTION-FIRST UX

Este es uno de los pilares de diferenciación.

La pantalla principal debe priorizar:

```text
¿QUÉ NECESITA TU ATENCIÓN?
```

Ejemplo:

```text
🔴 Tarjeta necesita $140
🟠 Comida está 82% usada
🟢 Meta vacaciones va +8%
🔵 Hay 3 transacciones para revisar
```

---

# 56. QUICK ACTIONS

Botón central:

```text
+
```

Acciones:

```text
Nueva transacción
Transferir
Ingreso
Objetivo
Escanear recibo
Split expense
```

Atajo:

```text
N
```

Web.

---

# 57. LIQUID GLASS

Aplicar como capa visual, no como dependencia del dominio.

## Uso recomendado

```text
Dashboard cards
Quick actions
Bottom sheets
Context panels
Notifications
Goal cards
```

## No usar excesivamente en:

```text
Dense transaction tables
Critical warnings
Accounting details
Forms with long text
```

### Accesibilidad

Debe existir:

```text
reduce motion
high contrast
disable blur
dark/light
```

---

# 58. DEPTH-BASED + ACTION-FIRST

La profundidad se utiliza para:

```text
overview
 ↓
category
 ↓
transactions
 ↓
transaction detail
```

No crear 3D real innecesario.

La profundidad será semántica:

```text
Level 1 — dashboard
Level 2 — category/account
Level 3 — transaction
Level 4 — audit/detail
```

---

# 58A. ESPECIFICACIÓN DE LOS TRES ESTILOS (AMPLÍA 57 Y 58)

Los tres estilos son **obligatorios** y se implementan en `specs/00b-design-system`.
Se aplican como capa visual y de interacción; no alteran reglas de dominio.

## 58A.1 Liquid Glass UI

**Dónde:** dashboard cards, quick actions, bottom sheets, paneles de contexto,
notificaciones, goal cards, dock del agente.
**Dónde NO:** tablas densas, formularios largos, advertencias críticas, detalle contable, Nivel 4.

Receta base:

```text
fondo translúcido (--glass-bg)
+ backdrop-filter: blur(--glass-blur) saturate(140%)
+ borde 1px (--glass-border)
+ brillo especular: gradiente sutil arriba-izquierda
+ tinte esmeralda 6–10% en superficies de acción
+ sombra suave según nivel de profundidad
```

Reglas:

- Máximo **3 capas de vidrio** visibles a la vez; nunca blur sobre listas largas.
- Contraste del texto sobre vidrio medido contra el peor fondo; si falla → scrim opaco.
- Fallbacks obligatorios:
  - `@supports not (backdrop-filter)` → superficie opaca `--surface-1`.
  - `prefers-reduced-transparency`, `prefers-contrast: more` → opaco + borde fuerte.
  - `prefers-reduced-motion` → sin parallax ni brillo animado.
  - Ajuste de usuario "Desactivar blur" y degradación automática en gama baja.
- El presupuesto de rendimiento del blur se mide en CI (ver sección 96).

## 58A.2 Depth-Based Interface Design

La profundidad es **semántica**, no 3D real (ver sección 58).

| Nivel | Pantalla | Superficie | Elevación | Transición |
|---|---|---|---|---|
| 1 | Dashboard | Vidrio | baja | base |
| 2 | Categoría / Cuenta | Vidrio + más opaco | media | el elemento tocado se expande (shared element) |
| 3 | Transacción | Casi opaco | alta | sheet desde abajo, fondo se atenúa y se aleja (scale 0.97) |
| 4 | Audit / detalle | **Opaco** | máxima | panel; sin blur por legibilidad |

Reglas:

- Cada nivel más profundo *acerca* al detalle; volver "aleja" (gesto/atrás/ESC).
- El nivel actual siempre es identificable (migas + elevación).
- Transiciones con Framer Motion (`layoutId`), duración 200–350 ms, curva única global.
- Con `reduce motion`: cambios instantáneos con fundido corto.
- Focus trap y retorno de foco correctos en sheets/paneles.

## 58A.3 Agentic UX / IA (UX de ambientes agentivos)

Principio: **el agente propone, el usuario decide**. Extiende P6 y P7 y las secciones 53, 54, 111–113.

1. **Intent-first:** barra de comando / texto libre ("gasté 25 en almuerzo") → el agente
   arma una *propuesta* editable, no ejecuta.
2. **Ciclo estándar:** `DRAFT → PROPOSED → APPROVED → APPLIED` (o `REJECTED / EXPIRED`), siempre con
   **vista previa del impacto** antes de aplicar y **Deshacer** después.
3. **Explicable:** cada propuesta muestra *qué observé · qué regla usé · qué propongo · qué impacto tiene*
   (chip "¿Por qué?").
4. **Confianza visible:** medidor de confianza; baja confianza → pregunta en vez de asumir.
5. **Presencia del agente:** *dock* persistente con estados: `idle`, `analizando`, `propuesta lista`,
   `necesita aprobación`. Nunca acciones silenciosas.
6. **Niveles de autonomía (elige el usuario, por área):**

   ```text
   N0  solo sugiere
   N1  auto-categoriza y permite deshacer (por defecto)
   N2  aplica reglas de bajo riesgo ya aprobadas
   Nunca: mover dinero real, pagos, aceptar deuda, vender activos (P7)
   ```
7. **Proactivo sin ruido:** el Centro de Atención prioriza por impacto, agrupa alertas,
   respeta horas de silencio y límite diario.
8. **Reversible y auditado:** todo efecto genera evento compensatorio y registro en audit log (sección 113).
9. **Degradación:** si la IA cae o el usuario la apaga, la app funciona completa.
10. **Seguridad:** texto de fuentes externas (memo bancario, OCR, CSV) es **dato**, nunca instrucción;
    el agente usa lista blanca de herramientas.

Componentes del sistema (en `packages/ui`):

```text
AgentDock · AgentProposalCard · ApprovalSheet · ExplainChip
ConfidenceMeter · UndoToast · AttentionCenter · IntentBar
```

Métricas: `AI_accept_rate`, `undo_rate`, `edit_before_apply_rate`, tiempo ahorrado por propuesta.

---

# 58B. CALCINPUT — CAMPO NUMÉRICO CON CALCULADORA

Detalle mínimo ya definido: **todo campo donde se ingresan números tiene calculadora
con operaciones elementales y calcula directamente.**

## 58B.1 Alcance

Usa `CalcInput`: monto de transacción, líneas de split, asignación a categoría, transferencias,
meta (objetivo y aporte), transacciones programadas, pagos de deuda, valor de activos, reparto de gastos.
Los campos que no son montos (p. ej. tasa FX, porcentajes) usan `NumericInput` (decimal simple).

## 58B.2 Comportamiento

```text
Operadores:  +  −  ×  ÷     (teclado: + - * /  ; también x y ÷)
Precedencia: × y ÷ antes que + y −  (estándar)
Cálculo:     en vivo — muestra "= resultado" mientras se escribe
Confirmar:   Enter, Tab, "=" o perder foco → el campo queda con el resultado
Ejemplos:    12+3.5        → 15.50
             100/3         → 33.33
             45*2-10       → 80.00
             20+15+8       → 43.00
```

- Decimal con `.` o `,` (locale es-BO); separadores de miles tolerados.
- Negativos y paréntesis: paréntesis **fase 2 opcional**; negativos según el campo (el signo de gasto/ingreso lo define el campo, no la expresión).
- Errores amigables en línea: división por cero, expresión incompleta, overflow (sin romper el formulario).
- Pegar `12+3` funciona; Deshacer/Rehacer nativo.
- **Móvil:** `inputmode="decimal"` no muestra operadores → teclado propio en bottom sheet con `+ − × ÷ =` y borrar.
- **A11y:** resultado anunciado con `aria-live="polite"`; operadores accesibles por teclado; etiquetas claras.

## 58B.3 Reglas financieras (P1, P2, sección 140)

- **Prohibido `eval`/`Function`.** Parser propio (descenso recursivo o shunting-yard) en `packages/money`.
- **Sin `float`.** Aritmética en decimal/`BigInt` sobre unidades menores; resultado convertido a `amount_minor`.
- División: redondeo determinista según la política de la sección 140; el resto lo absorbe una línea (en splits).
- La precisión depende de la moneda (`currencies`), no de un valor fijo de 2 decimales.

## 58B.4 Pruebas

- Unit: tabla de expresiones y errores.
- Property tests: contra una implementación decimal de referencia (sin errores de float).
- E2E: registrar una transacción escribiendo `25+18.5` en menos de 10 s (P11).

## 58B.5 Definition of Done adicional (se suma a la sección 84)

```text
[ ] Sin colores/medidas de marca hardcodeadas (usa tokens)
[ ] Todo monto usa CalcInput
[ ] Funciona con reduce motion / high contrast / sin blur
[ ] Tema oscuro y claro verificados
[ ] Contraste AA verificado en CI
[ ] Toda acción de IA pasa por propuesta → aprobación → deshacer
```

---

# 59. FASE 24 — GAMIFICATION

## SPEC 22

Gamificación orientada a comportamiento financiero positivo.

### Ejemplos

```text
7 días registrando gastos
30 días sin categoría negativa
Meta al 25%
Meta al 50%
Mes reconciliado
Primer mes presupuestado
```

No premiar:

```text
gastar menos a cualquier costo
usar crédito
mantener deuda
```

---

# 60. STREAKS

Ejemplo:

```text
Revisión semanal
🔥 6 semanas
```

Pero con opción:

```text
No mostrar gamificación
```

---

# 61. FASE 25 — OFFLINE-FIRST

## SPEC 23

El usuario debe poder:

- registrar gasto;
- editar gasto pendiente;
- consultar últimos datos;
- ver categorías;
- crear notas.

sin internet.

### Arquitectura

```text
UI
 ↓
Local store
 ↓
Sync queue
 ↓
Server
```

---

# 62. OFFLINE CONFLICTS

Si el mismo movimiento fue editado en dos dispositivos:

```text
server version
local version
```

mostrar:

```text
Hay un conflicto
```

No sobrescribir silenciosamente.

---

# 63. FASE 26 — AUTOMATION ENGINE

## SPEC 24

### Regla

```text
WHEN transaction arrives
IF payee = "Netflix"
THEN category = Streaming
```

### Acciones

```text
categorize
add tag
mark recurring
notify
suggest transfer
```

No permitir inicialmente:

```text
move actual bank money
```

---

# 64. FASE 27 — SMART ALERTS

Clasificación:

```text
CRITICAL
ACTION_REQUIRED
INSIGHT
INFO
```

Ejemplo:

```text
ACTION_REQUIRED
Tu presupuesto de transporte terminará
aproximadamente 8 días antes.
```

---

# 65. ANOMALY ENGINE

Detectar:

```text
gasto inusualmente alto
merchant desconocido
doble cargo
suscripción aumentó
categoría acelerándose
```

Ejemplo:

```text
Restaurantes

Media:
$220

Este mes:
$390

Desviación:
+77%
```

---

# 66. FASE 28 — ADVANCED ANALYTICS

## Métricas

```text
Savings rate
Expense growth
Category volatility
Recurring expense ratio
Debt ratio
Goal completion rate
Cash runway
Average monthly burn
Income stability
```

### Cash runway

Conceptualmente:

```text
cash runway =
liquid_cash / average_monthly_essential_expenses
```

No confundir con solvencia total.

---

# 67. AGE OF MONEY / CASH AGE

Debe existir una métrica equivalente.

Importante:

La fórmula observable se documentará como una métrica de flujo de caja y no como una reconstrucción de código privado.

### Modelo interno propuesto

Asignar una edad a lotes de efectivo:

```text
income batch
 ↓
FIFO spending allocation
 ↓
age = spending date - batch date
```

Promediar sobre una ventana configurable.

Ejemplo:

```text
Transacción A: 25 días
Transacción B: 31 días
Transacción C: 40 días

Average = 32 días
```

Debe existir documentación visible:

```text
¿Cómo se calcula?
```

---

# 68. FASE 29 — SEARCH GLOBAL

Buscar:

```text
transactions
accounts
categories
goals
payees
reports
```

Ejemplo:

```text
Ctrl + K
```

Resultado:

```text
Starbucks
Visa
Vacaciones
Comida
```

---

# 69. FASE 30 — COMMAND PALETTE

Acciones:

```text
Nueva transacción
Conciliar cuenta
Transferir
Crear meta
Ver gastos
Agregar recibo
Abrir tarjeta
```

Esto reduce navegación.

---

# 70. FASE 31 — NOTIFICATION CENTER

Canales:

```text
in-app
push
email
```

Preferencias granulares.

---

# 71. FASE 32 — AUDIT LOG

Cada operación importante:

```text
who
when
what
before
after
source
device
ip hash / metadata permitted
```

Ejemplo:

```text
2026-09-28
User:
Gabriel

Changed:
Food assigned

From:
500

To:
650
```

---

# 72. SEGURIDAD

## Principios

### Auth

- MFA opcional desde MVP si es viable.
- session expiration.
- device/session management.

### Database

RLS si se utiliza Supabase.

### Authorization

Nunca confiar en el frontend.

Cada consulta debe validar:

```text
user
→ budget membership
→ permission
→ resource
```

---

# 73. RLS

Regla conceptual:

```text
user can read budget
IF EXISTS budget_member
WHERE budget_id = row.budget_id
AND user_id = auth.uid()
```

Y equivalente para:

```text
accounts
categories
transactions
goals
reports
```

---

# 74. API ARCHITECTURE

## Domain API

```text
/budgets
/budgets/:id/accounts
/budgets/:id/categories
/budgets/:id/transactions
/budgets/:id/goals
/budgets/:id/reports
/budgets/:id/reconciliation
/budgets/:id/rules
/budgets/:id/members
```

### Commands

```text
createTransaction
splitTransaction
transferMoney
assignBudget
moveBudget
reconcileAccount
createGoal
```

### Queries

```text
getBudgetOverview
getAccountRegister
getCategoryStatus
getReports
```

---

# 75. COMMAND / QUERY SEPARATION

No mezclar:

```text
getBudgetOverview()
```

con

```text
createTransaction()
```

Los comandos modifican.

Las queries leen.

---

# 76. DOMAIN SERVICES

Crear servicios puros:

```text
BudgetEngine
TransactionEngine
GoalEngine
CreditCardEngine
ReconciliationEngine
ReportEngine
FXEngine
DebtEngine
AutomationEngine
```

---

# 77. PURE DOMAIN FUNCTIONS

Ejemplos:

```text
calculateAvailableCategory()
calculateReadyToAssign()
calculateGoalRequired()
calculateCardPaymentAvailable()
calculateTransferPair()
calculateReconciliationDifference()
calculateNetWorth()
```

Estas funciones deben poder testearse sin React ni DB.

---

# 78. TESTING STRATEGY

## Pirámide

```text
            E2E
          /-----\
       Integration
      /-----------\
      Unit + Property
    /---------------\
      Domain Logic
```

---

# 79. UNIT TESTS

Obligatorios para:

```text
money
budget engine
goals
cards
splits
transfers
reconciliation
FX
debt
reports
```

---

# 80. PROPERTY TESTS

Ejemplo:

Para cualquier split:

```text
sum(children) == parent
```

Para cualquier transferencia:

```text
sum(transfer_pair) == 0
```

Para una reconciliación correcta:

```text
difference == 0
```

---

# 81. E2E TESTS CRÍTICOS

## Journey 1

```text
Register
→ Create Budget
→ Create Account
→ Add Income
→ Assign Money
→ Add Expense
→ See Available
```

## Journey 2

```text
Create credit card
→ Budget category
→ Spend
→ Pay card
→ Reconcile
```

## Journey 3

```text
Create goal
→ Assign
→ Spend elsewhere
→ Rollover
→ Goal recalculates
```

## Journey 4

```text
CSV import
→ match
→ review
→ accept
→ reconcile
```

---

# 82. FASES DE IMPLEMENTACIÓN REALES

## Sprint Group A — Foundation

```text
A1 Repo
A2 Auth
A3 DB
A4 CI
A5 UI system
A6 Error handling
A7 Logging
```

## Sprint Group B — Core Ledger

```text
B1 Budgets
B2 Accounts
B3 Transactions
B4 Payees
B5 Splits
B6 Transfers
```

## Sprint Group C — Budget

```text
C1 Category groups
C2 Category months
C3 RTA
C4 Rollover
C5 Overspending
```

## Sprint Group D — Planning

```text
D1 Goals
D2 Scheduled transactions
D3 Credit cards
D4 Reconciliation
```

## Sprint Group E — Imports

```text
E1 CSV
E2 OFX/QFX
E3 Matching
E4 Dedup
```

## Sprint Group F — Reports

```text
F1 Net Worth
F2 Income/Expense
F3 Spending
F4 Cash flow
```

## Sprint Group G — Collaboration

```text
G1 Members
G2 Roles
G3 Invitations
G4 Activity
```

---

# 83. DIFFERENTIATION SPRINTS

## H1 Multi-currency

## H2 Shared expenses

## H3 Advanced goals

## H4 Debt planner

## H5 Assets

## H6 AI categorization

## H7 Receipt OCR

## H8 Finance copilot

## H9 Automation engine

## H10 Smart alerts

## H11 Gamification

## H12 Offline mode

## H13 Advanced analytics

---

# 84. DEFINITION OF DONE

Una feature NO está terminada cuando:

```text
"el código compila"
```

Está terminada cuando:

### Product

- user story implemented;
- acceptance criteria pass;
- edge cases covered;
- UX reviewed.

### Technical

- types correct;
- validation implemented;
- authorization verified;
- database migration present;
- tests pass.

### Operational

- logging;
- error handling;
- metrics;
- documentation.

### Spec Kit

```text
spec.md ✅
plan.md ✅
tasks.md ✅
analyze ✅
implement ✅
converge ✅
```

La documentación oficial de Spec Kit recomienda usar `converge` para comparar la implementación actual contra los artefactos de intención y añadir las tareas restantes hasta cerrar la brecha.

---

# 85. TEMPLATE DE CADA SPEC

Cada feature debe tener:

```text
spec.md
```

con:

```markdown
# Feature

## Goal

## Problem

## Scope

## Non-goals

## Actors

## User Stories

## Functional Requirements

## Non-functional Requirements

## Data Requirements

## Business Rules

## Edge Cases

## Acceptance Criteria

## Success Criteria

## Risks

## Dependencies

## Open Questions
```

---

# 86. USER STORIES FORMATO

Ejemplo:

```markdown
## US1 — Registrar gasto

Como usuario,
quiero registrar una compra,
para actualizar mi presupuesto.

### Acceptance Scenario

Given:
Tengo una cuenta con 500 disponibles.

When:
Registro una compra de 50 en Comida.

Then:
La cuenta disminuye 50.

And:
La categoría Comida disminuye 50.

And:
El presupuesto refleja correctamente el nuevo disponible.
```

---

# 87. REQUIREMENTS IDS

Usar IDs estables.

```text
FR-001
FR-002
FR-003
```

Ejemplo:

```text
FR-BUD-001
FR-TRX-001
FR-GOAL-001
```

### No renombrarlos cuando cambia el código.

Esto permite traceability.

---

# 88. TRACEABILITY

Crear:

```text
traceability.md
```

Ejemplo:

| Requirement | Spec | Plan | Task | Test |
|---|---|---|---|---|
| FR-TRX-001 | 04 | P-TRX-1 | T-032 | TX-001 |
| FR-GOAL-003 | 06 | P-GOAL-2 | T-121 | GOAL-014 |
| FR-CC-004 | 07 | P-CC-1 | T-168 | CC-009 |

---

# 89. MASTER ROADMAP PRIORITIES

## P0 — Blockers

```text
Authentication
Database
Ledger
Money arithmetic
Authorization
Budget engine
Transactions
```

## P1 — Core product

```text
Categories
Goals
Credit cards
Reconciliation
Imports
Scheduled transactions
Reports
```

## P2 — Differentiation

```text
Multi currency
Shared expenses
Assets
Debt planner
AI
Automation
Offline
Gamification
```

## P3 — Scale

```text
Open finance
Advanced notifications
Public API
Enterprise
Marketplace
```

---

# 90. NO HACER TODAVÍA

Para evitar sobrecarga:

```text
No:
- criptografía propia;
- trading;
- robo-advisor;
- pagos reales;
- transferencias bancarias automáticas;
- IA que mueva dinero;
- marketplace;
- microservicios desde día uno;
- event sourcing completo si no es necesario;
- soporte para 50 bancos simultáneamente;
- app móvil nativa separada antes de validar web.
```

---

# 91. ARQUITECTURA INICIAL RECOMENDADA

```text
                ┌───────────────────┐
                │     Next.js       │
                │   Web / PWA       │
                └─────────┬─────────┘
                          │
                  Domain API Layer
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
 Budget Engine       Transaction      AI Gateway
        │              Engine              │
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                   PostgreSQL
                          │
                   Drizzle ORM
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   Supabase Auth     Storage            Realtime
```

---

# 92. POR QUÉ NO EMPEZAR CON MICROSERVICIOS

El dominio tiene muchas invariantes financieras que inicialmente se benefician de:

```text
una base relacional
+
transacciones ACID
+
dominio modular
```

No separar servicios hasta que exista:

- carga real;
- límites claros;
- necesidad operativa.

---

# 93. MODULE BOUNDARIES

Dentro de un monolito modular:

```text
auth/
budget/
ledger/
goals/
cards/
reconciliation/
imports/
reports/
collaboration/
fx/
assets/
ai/
automation/
notifications/
```

Cada módulo tiene:

```text
domain
application
infrastructure
```

---

# 94. EVENTOS DE DOMINIO

Ejemplos:

```text
TransactionCreated
TransactionUpdated
TransactionVoided

BudgetAssigned
BudgetMoved

GoalCreated
GoalProgressed

AccountReconciled

BankSyncCompleted
TransactionMatched

AiSuggestionCreated
AiSuggestionAccepted
```

Estos eventos pueden ser inicialmente internos.

---

# 95. CACHE

Nunca cachear sin estrategia:

```text
budget available
card payment available
account balance
```

Si se cachean:

```text
source of truth = DB
```

El cache nunca puede considerarse el saldo oficial.

---

# 96. PERFORMANCE TARGETS

Objetivos iniciales:

```text
Dashboard:
< 1.5 s perceived load

Quick transaction:
< 300 ms local feedback

Budget calculation:
< 200 ms typical budget

Search:
< 300 ms typical
```

Estos son objetivos internos, no garantías.

---

# 97. OBSERVABILITY

Cada operación importante debe registrar:

```text
request_id
user_id
budget_id
feature
duration
result
error
```

No registrar:

```text
password
bank credentials
full financial raw payloads
access tokens
```

---

# 98. DATABASE INDEXES

Mínimos:

```sql
transactions(account_id, date)
transactions(budget_id, date)
transactions(payee_id)
transactions(category_id, date)

category_months(category_id, month)

goals(category_id)

budget_members(user_id, budget_id)

accounts(budget_id)

payees(budget_id, normalized_name)

audit_events(budget_id, created_at)
```

---

# 99. UNIQUE CONSTRAINTS

Ejemplos:

```text
budget_members:
UNIQUE(user_id, budget_id)

category_months:
UNIQUE(category_id, month)

currencies:
UNIQUE(code)

payees:
UNIQUE(budget_id, normalized_name)

external transaction:
UNIQUE(account_id, external_transaction_id)
```

---

# 100. SOFT DELETE

No borrar históricamente:

```text
accounts
categories
payees
transactions
```

Usar:

```text
archived_at
closed_at
voided_at
```

---

# 101. MIGRATIONS

Todas las migraciones:

```text
001_initial
002_identity
003_budgets
004_accounts
005_transactions
...
```

Nunca editar una migration ya aplicada.

Crear otra.

---

# 102. SEED DATA

Debe existir:

```text
demo user
demo budget
accounts
categories
sample transactions
goals
credit card
```

Esto facilita:

- desarrollo;
- demos;
- QA;
- screenshots;
- testing.

---

# 103. PRODUCT DEMO SCENARIO

El seed debe demostrar:

```text
Ingreso mensual
Renta
Supermercado
Tarjeta
Meta vacaciones
Fondo emergencia
Transferencia ahorro
Reembolso
Split
Préstamo
```

Así el producto puede demostrar casi todas las funcionalidades.

---

# 104. UX PRINCIPAL

## Home

```text
┌───────────────────────────────────────┐
│ Hola, Gabriel                         │
│                                       │
│ Disponible para asignar               │
│ $ 720                                 │
│                                       │
│ [Asignar dinero] [Registrar gasto]   │
└───────────────────────────────────────┘

¿Qué necesita tu atención?

[Tarjeta      $140 por cubrir]
[Meta         62%]
[3 movimientos por revisar]

Tu mes

[Comida]        72%
[Transporte]    51%
[Hogar]         48%
```

---

# 105. ACCOUNT SCREEN

```text
Visa Gold

Saldo
-850

Disponible para pagar
850

Estado
✓ 100% cubierto

[Agregar movimiento]
[Conciliar]
[Pagar]
```

Esto elimina la necesidad de que el usuario entienda internamente todo el modelo desde el primer día.

---

# 106. BUDGET SCREEN

Vista:

```text
GASTOS FIJOS

Alquiler      1000 / 1000 ✓
Internet        30 / 30 ✓
Electricidad    65 / 90

VIDA DIARIA

Comida         420 / 600
Transporte     110 / 200

OBJETIVOS

Emergencia     750 / 5000
Vacaciones    1000 / 3000
```

---

# 107. ZERO-BASED UX

En lugar de:

```text
Assign / Activity / Available
```

mostrar al usuario común:

```text
Para asignar
Asignado
Gastado
Disponible
```

y permitir:

```text
Modo avanzado
```

para visualizar la contabilidad completa.

---

# 108. MODO SIMPLE VS AVANZADO

## Simple

```text
Disponible
Gastado
Objetivo
```

## Advanced

```text
Assigned
Activity
Available
Rollovers
Credit card movement
Reconciliation status
```

Esta separación ataca directamente la curva de aprendizaje.

---

# 109. ONBOARDING

## Paso 1

```text
¿Qué quieres conseguir?
```

Opciones:

```text
Controlar gastos
Ahorrar
Pagar deudas
Ordenar mis cuentas
Construir patrimonio
```

## Paso 2

```text
¿Cuánto dinero tienes disponible?
```

## Paso 3

```text
¿Dónde está?
```

## Paso 4

```text
¿Qué pagos ya sabes que tendrás?
```

## Paso 5

El sistema crea una estructura inicial.

---

# 110. NO OBLIGAR A ENTENDER YNAB

El usuario no debería aprender primero:

```text
RTA
Age of Money
Envelope
Roll with the punches
Credit card category
```

Primero ve:

```text
Dinero
Tareas
Objetivos
Próximos pagos
```

Los conceptos avanzados aparecen cuando son relevantes.

---

# 111. AI COPILOT UX

Ejemplo:

```text
🤖 Encontré 3 formas de liberar
$180 para tu meta.

1. Entretenimiento -80
2. Restaurantes -60
3. Compras -40

¿Quieres aplicar?
```

Botones:

```text
[Aplicar]
[Editar]
[Ignorar]
```

---

# 112. AI SAFETY MODEL

Cada acción de IA debe tener:

```text
PROPOSED
```

antes de:

```text
APPLIED
```

Estados:

```text
DRAFT
PROPOSED
APPROVED
APPLIED
REJECTED
EXPIRED
```

---

# 113. AI AUDIT

Guardar:

```text
prompt intent
tool calls
data source IDs
recommendation
user action
final effect
```

No necesariamente guardar el prompt completo si contiene datos sensibles; dependerá de la política de privacidad.

---

# 114. PRIVACY MODEL

El usuario debe poder:

```text
Export data
Delete account
Delete receipts
Delete AI history
Disconnect bank
Revoke sessions
```

---

# 115. EXPORT

Formato:

```text
CSV
JSON
PDF reports
```

Exportación completa:

```text
accounts
transactions
categories
goals
budgets
audit
```

---

# 116. IMPORT / MIGRATION

Feature futura:

```text
YNAB CSV import
```

Diseñar desde el inicio un `ImportAdapter`:

```text
ImportSource
 ├─ CSV
 ├─ OFX
 ├─ QFX
 ├─ YNAB
 └─ Generic
```

---

# 117. PUBLIC API

No es MVP obligatorio, pero diseñar internamente como si existiera.

Versionar:

```text
/api/v1
```

Scopes posibles:

```text
budget:read
budget:write
transactions:read
transactions:write
reports:read
```

---

# 118. WEBHOOKS FUTUROS

Eventos:

```text
transaction.created
transaction.updated
transaction.matched
goal.reached
account.reconciled
budget.overspending
```

---

# 119. FEATURE FLAG SYSTEM

Todas las grandes features deben poder apagarse.

Ejemplo:

```text
AI_CATEGORIZATION
MULTI_CURRENCY
SHARED_EXPENSES
OFFLINE_MODE
GOAL_V2
DEBT_PLANNER
```

---

# 120. RELEASE STRATEGY

## Alpha

Solo:

```text
auth
budget
account
transaction
categories
basic goals
```

## Beta

Añadir:

```text
cards
reconcile
imports
reports
collaboration
```

## V1

Añadir:

```text
multi-currency
assets
debt
AI categorization
```

## V1.5

```text
OCR
copilot
automations
offline
shared expenses
```

## V2

```text
advanced intelligence
open finance
public API
```

---

# 121. MVP MÍNIMO ABSOLUTO

Si el tiempo se vuelve crítico:

```text
1. Auth
2. Budget
3. Categories
4. Accounts
5. Transactions
6. Splits
7. Transfers
8. Rollover
9. Goals
10. Credit cards
11. Reconciliation
12. Reports
```

Esto ya constituye un producto serio.

---

# 122. DIFERENCIADOR MÍNIMO

Para evitar tener “otro YNAB”:

Implementar al menos:

```text
AI categorization
+
Action-first dashboard
+
Multi-currency
+
Advanced goals
```

---

# 123. PLAN DE ESPECIFICACIONES

## SPEC 00

```text
Roadmap / Product architecture
```

## SPEC 01

```text
Identity
```

## SPEC 02

```text
Budgets
```

## SPEC 03

```text
Accounts
```

## SPEC 04

```text
Transactions
```

## SPEC 05

```text
Budget Engine
```

## SPEC 06

```text
Goals
```

## SPEC 07

```text
Credit Cards
```

## SPEC 08

```text
Reconciliation
```

## SPEC 09

```text
Imports
```

## SPEC 10

```text
Scheduled Transactions
```

## SPEC 11

```text
Payees and Rules
```

## SPEC 12

```text
Reports
```

## SPEC 13

```text
Collaboration
```

## SPEC 14

```text
Multi-currency
```

## SPEC 15

```text
Shared Expenses
```

## SPEC 16

```text
Advanced Goals
```

## SPEC 17

```text
Assets
```

## SPEC 18

```text
Debt Planner
```

## SPEC 19

```text
AI Categorization
```

## SPEC 20

```text
Receipt OCR
```

## SPEC 21

```text
AI Copilot
```

## SPEC 22

```text
Gamification
```

## SPEC 23

```text
Offline
```

## SPEC 24

```text
Advanced Analytics
```

---

# 124. ORDEN DE DEPENDENCIAS

```text
00 Roadmap
  ↓
01 Identity
  ↓
02 Budgets
  ↓
03 Accounts
  ↓
04 Transactions
  ↓
05 Budget Engine
  ↓
06 Goals
  ↓
07 Credit Cards
  ↓
08 Reconciliation
  ↓
09 Imports
  ↓
10 Scheduled Transactions
  ↓
11 Rules
  ↓
12 Reports
  ↓
13 Collaboration
  ↓
14 Multi Currency
  ↓
15 Shared Expenses
  ↓
16 Advanced Goals
  ↓
17 Assets
  ↓
18 Debt
  ↓
19 AI Categorization
  ↓
20 OCR
  ↓
21 AI Copilot
  ↓
22 Gamification
  ↓
23 Offline
  ↓
24 Analytics
```

---

# 125. PARALELIZACIÓN

Pueden trabajar en paralelo:

```text
Accounts
Categories
UI System
Auth
```

Luego:

```text
Transactions
Budget Engine
```

Después:

```text
Goals
Cards
Reports
```

No paralelizar agresivamente:

```text
Budget Engine
Credit Card Engine
Transaction Engine
```

porque comparten invariantes críticas.

---

# 126. REGLA PARA AGENTES DE IA

Nunca ejecutar:

```text
/speckit.implement
```

sobre cientos de tasks simultáneamente.

Preferir:

```text
1 fase
5–15 tasks
converge
```

Luego continuar.

Esto reduce errores de contexto y facilita revisión.

---

# 127. TASK FORMAT SPEC KIT

Cada task debe respetar el patrón:

```text
- [ ] [T001] [P] [US1] Implement...
```

Donde:

```text
[T001] = task ID
[P] = paralelizable
[US1] = user story
```

La plantilla de Spec Kit establece este formato y exige que las tareas estén organizadas por historia de usuario.

---

# 128. EJEMPLO DE TASKS

```text
- [ ] T001 Create users migration
- [ ] T002 Create budgets migration
- [ ] T003 [P] Create Zod validation for BudgetCreateInput
- [ ] T004 Implement BudgetRepository
- [ ] T005 Implement BudgetService
- [ ] T006 Implement POST /budgets
- [ ] T007 Implement budget dashboard query
- [ ] T008 Add integration tests
- [ ] T009 Add Playwright onboarding flow
```

---

# 129. PROMPT PARA CREAR LA CONSTITUTION

Usar:

```text
/speckit.constitution

Create the project constitution for a personal finance and budgeting platform.

Mandatory principles:
- financial correctness first
- integer money representation
- deterministic budget calculations
- immutable financial history
- strong authorization
- privacy by design
- explainable AI
- human approval for financial actions
- accessibility WCAG 2.2 AA
- mobile-first quick transaction entry
- offline-safe transaction capture
- comprehensive automated testing
- domain logic independent from UI
- PostgreSQL as source of truth
- auditable changes
```

---

# 130. PROMPT PARA ROADMAP

```text
/speckit.specify

Create the master roadmap for a personal finance platform.

The product has two equally important halves:

50%:
functional coverage of a modern envelope / zero-based budgeting system:
budgets, categories, accounts, transactions, splits, transfers,
rollover, goals, scheduled transactions, credit cards,
reconciliation, imports, reports and collaboration.

50%:
independent differentiation:
advanced goals, multi-currency, shared expenses,
assets/net worth, debt planner, AI categorization,
receipt OCR, finance copilot, automation engine,
smart alerts, gamification, offline support and advanced analytics.

Use a spec-of-specs structure and define dependencies between features.
Do not implement everything in one feature.
```

---

# 131. PROMPT PARA CADA CORE SPEC

Ejemplo:

```text
/speckit.specify

Build the transaction engine for a personal finance platform.

The engine must support:
- income
- expense
- transfers
- split transactions
- refunds
- pending/cleared/reconciled states
- imported transactions
- matching
- deduplication
- immutable audit history

Define:
- user stories
- functional requirements
- financial invariants
- edge cases
- acceptance scenarios
- non-goals
- security requirements
```

---

# 132. PROMPT PARA PLAN

```text
/speckit.plan

Use:
- Next.js
- TypeScript
- PostgreSQL
- Supabase
- Drizzle ORM
- Zod
- Vitest
- Playwright

Keep domain logic independent from React.
Use integer minor units for money.
Design the feature as a modular domain component.
Include migrations, repositories, services, API contracts,
tests, observability and rollback strategy.
```

---

# 133. PROMPT PARA CLARIFY

Antes de `plan`:

```text
/speckit.clarify

Focus on ambiguity around:
- financial invariants
- negative balances
- future months
- refunds
- transfers
- multi-currency
- account reconciliation
- credit card payment availability
- permissions
```

---

# 134. PROMPT PARA ANALYZE

```text
/speckit.analyze

Check consistency between:
- constitution
- spec
- plan
- data model
- contracts
- tasks

Pay special attention to:
- duplicate source-of-truth fields
- money arithmetic
- transaction lifecycle
- transfer symmetry
- split invariants
- authorization gaps
- race conditions
- missing edge cases
```

---

# 135. PROMPT PARA CONVERGE

```text
/speckit.converge

Verify that the implemented code fully satisfies:
- functional requirements
- acceptance criteria
- domain invariants
- security constraints
- tests
- planned architecture

Identify all missing work and append only actionable tasks.
```

---

# 136. ROADMAP DE PRODUCTO COMPLETO

## Milestone M0

```text
Architecture + Constitution
```

## M1

```text
Ledger MVP
```

## M2

```text
Budget Engine
```

## M3

```text
Goals + Credit Cards
```

## M4

```text
Reconciliation + Imports
```

## M5

```text
Reports + Collaboration
```

### Aquí se alcanza aproximadamente el 50% “YNAB-like”.

---

## M6

```text
Advanced Goals
```

## M7

```text
Multi Currency
```

## M8

```text
Assets + Net Worth
```

## M9

```text
Debt Planner
```

## M10

```text
AI Categorization
```

## M11

```text
Receipt OCR
```

## M12

```text
Finance Copilot
```

## M13

```text
Automation
```

## M14

```text
Offline
```

## M15

```text
Gamification + Analytics
```

### Aquí se completa el 50% de diferenciación.

---

# 137. CHECKPOINTS

Cada milestone debe tener:

```text
Feature demo
Unit tests
Integration tests
E2E tests
Security review
UX review
Performance review
Convergence
```

---

# 138. FINANCIAL QA SCENARIO MATRIX

Crear una matriz con:

```text
Income
Expense
Refund
Transfer
Split
Overspending
Credit card
Credit card payment
Cash
Loan
Goal
Rollover
Future month
Reconciliation
Import
Duplicate
Multi-currency
```

Cada combinación importante debe probarse.

---

# 139. EDGE CASES MÍNIMOS

## Transaction

- amount zero;
- negative amount;
- future date;
- duplicate;
- edited after reconciliation;
- voided transaction.

## Split

- one split;
- two splits;
- 100 splits;
- rounding difference;
- deleted split.

## Transfer

- same account;
- closed destination;
- different currencies;
- edited amount.

## Goals

- deadline today;
- deadline past;
- zero target;
- negative assignment;
- target already reached.

## Credit card

- full coverage;
- partial coverage;
- refund;
- overspending;
- payment exceeds balance;
- payment reversed.

---

# 140. ROUNDING POLICY

Para dividir:

```text
100.00 / 3
```

usar:

```text
33.33
33.33
33.34
```

El sistema debe asignar el remainder a una línea determinísticamente.

Nunca:

```text
33.333333...
```

en la base de datos.

---

# 141. CONCURRENCY

Problema:

Dos dispositivos asignan el mismo dinero al mismo tiempo.

Solución:

```text
transaction
+
row locking
+
optimistic version
```

Ejemplo conceptual:

```text
UPDATE category_months
SET assigned = assigned + 100,
    version = version + 1
WHERE id = ?
AND version = ?
```

Si falla:

```text
409 Conflict
```

La UI puede refrescar y mostrar:

```text
El presupuesto cambió desde otro dispositivo.
```

---

# 142. IDEMPOTENCY

Todas las operaciones externas importantes deben tener:

```text
idempotency_key
```

Especialmente:

```text
bank sync
imports
webhooks
AI action apply
```

---

# 143. ERROR MODEL

Errores de dominio:

```text
INSUFFICIENT_FUNDS
INVALID_SPLIT
TRANSFER_CURRENCY_MISMATCH
RECONCILIATION_MISMATCH
GOAL_INVALID
PERMISSION_DENIED
DUPLICATE_TRANSACTION
```

No devolver mensajes crípticos al usuario.

---

# 144. UX DE ERRORES

Malo:

```text
Error 400
```

Bueno:

```text
No se pudo guardar.

La distribución de esta compra suma
$145, pero la compra total es $150.

Faltan:
$5

[Corregir]
```

---

# 145. PRODUCT ANALYTICS

Medir:

```text
time_to_first_transaction
time_to_first_budget
percentage_of_users_reconciling
goal_creation_rate
AI_accept_rate
manual_categorization_rate
sync_success_rate
duplicate_rate
weekly_active_users
```

---

# 146. UX SUCCESS METRICS

### Objetivos internos

```text
<10 sec
quick transaction

<5 min
first basic budget

>80%
AI suggestions accepted after learning

low reconciliation failure

high weekly budget review completion
```

Estas métricas deben tratarse como objetivos de producto, no como resultados garantizados.

---

# 147. MVP CHECKLIST

```text
[ ] Auth
[ ] Profile
[ ] Budget
[ ] Category groups
[ ] Categories
[ ] Accounts
[ ] Transactions
[ ] Splits
[ ] Transfers
[ ] Payees
[ ] Rollover
[ ] Overspending
[ ] Goals
[ ] Credit cards
[ ] Scheduled transactions
[ ] Reconciliation
[ ] CSV import
[ ] Reports
[ ] Collaboration
[ ] Audit
[ ] Responsive UI
[ ] Accessibility
[ ] E2E
```

---

# 148. DIFFERENTIATION CHECKLIST

```text
[ ] Advanced goals
[ ] Multi-currency
[ ] Shared expenses
[ ] Assets
[ ] Net worth advanced
[ ] Debt planner
[ ] AI categorization
[ ] Receipt OCR
[ ] Finance copilot
[ ] Automation engine
[ ] Smart alerts
[ ] Offline
[ ] Gamification
[ ] Advanced analytics
```

---

# 149. FINAL PRODUCT NORTH STAR

El producto NO debe sentirse como:

```text
"un Excel bonito"
```

Debe sentirse como:

```text
"un copiloto financiero que convierte
mis movimientos de dinero en decisiones claras."
```

---

# 150. ORDEN PRÁCTICO PARA EMPEZAR MAÑANA

## Día 1

```text
specify init
constitution
```

## Día 2

```text
roadmap
architecture
domain glossary
```

## Día 3

```text
spec Identity
plan Identity
tasks Identity
```

## Día 4+

```text
implement
converge
```

Luego:

```text
Budgets
Accounts
Transactions
Budget Engine
```

No saltar inmediatamente a IA.

Primero construir un ledger correcto.

---

# 151. REGLA FINAL DE DESARROLLO

La secuencia correcta es:

```text
          UX
           ↓
       SPECIFICATION
           ↓
       DOMAIN MODEL
           ↓
      FINANCIAL RULES
           ↓
        DATABASE
           ↓
        SERVICES
           ↓
           API
           ↓
           UI
           ↓
           TESTS
           ↓
        CONVERGENCE
```

No:

```text
UI
→ improvisar DB
→ arreglar cálculos
→ parchear bugs
→ añadir IA
```

---

# 152. REFERENCIAS DE METODOLOGÍA

Spec Kit define el flujo Spec-Driven Development para convertir requisitos en especificaciones, planes y tareas, y posteriormente implementar y converger hasta cerrar la brecha entre intención y código.

Para sistemas grandes, Spec Kit recomienda descomponer el trabajo en sub-features cuando una única especificación sería demasiado grande, utilizando el patrón de “spec of specs”.

La generación de tareas debe mantener tareas ordenadas por dependencia e historia de usuario y utilizar IDs/checklists trazables.

---

# 153. ARCHIVOS QUE DEBEN EXISTIR AL FINAL DEL ROADMAP

```text
specs/00-roadmap/spec.md
specs/00-roadmap/plan.md
specs/00-roadmap/tasks.md

specs/01-identity/spec.md
specs/01-identity/plan.md
specs/01-identity/tasks.md

specs/02-budgets/spec.md
specs/02-budgets/plan.md
specs/02-budgets/tasks.md

...

specs/24-analytics/spec.md
specs/24-analytics/plan.md
specs/24-analytics/tasks.md
```

Y transversalmente:

```text
.specify/memory/constitution.md
docs/domain/glossary.md
docs/domain/invariants.md
docs/domain/financial-model.md
docs/ADR/
docs/api/
docs/diagrams/
```

---

# 154. RESULTADO ESPERADO

Al finalizar el bloque Core:

```text
                CORE 50%
      ┌────────────────────────┐
      │ Budget Engine          │
      │ Ledger                 │
      │ Accounts               │
      │ Transactions           │
      │ Goals                  │
      │ Credit Cards           │
      │ Reconciliation         │
      │ Imports                │
      │ Reports                │
      │ Collaboration          │
      └────────────────────────┘
```

Y al finalizar el bloque de diferenciación:

```text
             DIFFERENTIATION 50%
      ┌────────────────────────┐
      │ Multi Currency         │
      │ Shared Expenses        │
      │ Advanced Goals         │
      │ Assets                 │
      │ Debt Planner           │
      │ AI Categorization      │
      │ OCR                    │
      │ Finance Copilot        │
      │ Automation             │
      │ Offline                │
      │ Gamification           │
      │ Advanced Analytics     │
      └────────────────────────┘
```

---

# 155. DEFINICIÓN FINAL DEL PROYECTO

La aplicación debe combinar tres capas:

```text
               EXPERIENCE
        ┌─────────────────────┐
        │ Action-First UX     │
        │ Liquid Glass        │
        │ Goals               │
        │ AI Copilot          │
        └──────────┬──────────┘
                   │
              FINANCIAL OS
        ┌──────────┴──────────┐
        │ Budget Engine       │
        │ Ledger              │
        │ Goals               │
        │ Credit Cards        │
        │ Reconciliation      │
        └──────────┬──────────┘
                   │
              DATA PLATFORM
        ┌──────────┴──────────┐
        │ PostgreSQL          │
        │ Supabase            │
        │ Drizzle             │
        │ Audit               │
        │ Banking adapters    │
        └─────────────────────┘
```

La prioridad absoluta es:

```text
CORRECTNESS
     ↓
CLARITY
     ↓
SPEED
     ↓
AUTOMATION
     ↓
DELIGHT
```

No invertir este orden.

---

# 156. PRÓXIMO PASO RECOMENDADO

Convertir este roadmap en:

```text
specs/00-roadmap/spec.md
```

y después generar automáticamente, mediante Spec Kit:

```text
specs/01-identity/*
specs/02-budgets/*
specs/03-accounts/*
...
```

Cada spec deberá ser implementable de forma independiente, pero deberá respetar la Constitución, los invariantes financieros y el modelo de datos maestro.

---

# 157. CONTROL DE CAMBIOS Y NUMERACIÓN CANÓNICA

## 157.1 Cambios de esta versión

```text
+ Nombre Bolsilludo y guía de logo            (0.5.1)
+ Paleta oficial + contraste validado         (0.5.2, 0.5.3)
+ Tokens como fuente única                    (0.5.4, P13)
+ Liquid Glass / Depth / Agentic UX detallados (58A, P15)
+ CalcInput universal                         (58B, P14)
+ SPEC 00b design-system y SPEC 25 platform-ux
- Eliminados residuos de citas del texto original
```

## 157.2 Problema detectado

El plan original usaba **tres sistemas de numeración** (SPEC 00–24, Sprint A–H, Milestone M0–M15)
y las secciones 2/5 no coincidían con la 124 (p. ej. "Rules" y "Automations").
Además, Shared Expenses, Smart Alerts, Scheduled, Search, Command Palette y
Notification Center no tenían milestone asignado.

## 157.3 Mapa canónico (manda sobre secciones 2, 82, 123, 124 y 136)

| SPEC | Carpeta | Contiene (Fase del texto) | Milestone |
|---|---|---|---|
| 00 | `00-roadmap` | Roadmap, arquitectura, glosario | M0 |
| 00b | `00b-design-system` | Marca, tokens, 3 estilos, CalcInput | M0 |
| 01 | `01-identity` | Identity (F2), base de audit (F32) | M1 |
| 02 | `02-workspaces-budgets` | Budgets (F3), Categories (F4) | M1 |
| 03 | `03-accounts` | Accounts (F5) | M1 |
| 04 | `04-transactions` | Transactions (F6), splits, transfers, payees (F13) | M1 |
| 05 | `05-budget-engine` | ZBB, rollover, overspending (F7) | M2 |
| 06 | `06-goals` | Goals (F8) | M3 |
| 07 | `07-credit-cards` | Credit cards (F9) | M3 |
| 10 | `10-scheduled-transactions` | Scheduled (F12) | M3 |
| 08 | `08-reconciliation` | Reconciliation (F10) | M4 |
| 09 | `09-imports` | CSV/OFX, matching, dedup (F11) | M4 |
| 11 | `11-reports` | Reports (F14) | M5 |
| 12 | `12-collaboration` | Collaboration (F15), audit UI | M5 |
| 25 | `25-platform-ux` | Search (F29), Command palette (F30), Notifications (F31); shell action-first (F23) desde M1 | M1 / M5 |
| 15 | `15-advanced-goals` | Goals v2 y escenarios | M6 |
| 13 | `13-multi-currency` | Multi-currency (F16) | M7 |
| 14 | `14-shared-expenses` | Shared expenses (F17) | M7 |
| 20 | `20-net-worth-assets` | Assets / Net worth (F18) | M8 |
| 21 | `21-debt-planner` | Debt planner (F19) | M9 |
| 17 | `17-ai-categorization` | AI categorization (F20) | M10 |
| 18 | `18-receipt-ocr` | Receipt OCR (F21) | M11 |
| 19 | `19-ai-copilot` | Copilot (F22) + Agentic UX | M12 |
| 16 | `16-automations` | Automations (F26), Smart alerts (F27), rules (F13) | M13 |
| 23 | `23-offline` | Offline-first (F25) | M14 |
| 22 | `22-gamification` | Gamification (F24) | M15 |
| 24 | `24-analytics` | Advanced analytics (F28) | M15 |

## 157.4 Decisiones de arquitectura pendientes (abrir como ADR en la iteración I2)

```text
ADR-A  Móvil: recomendado PWA-first con Next.js; apps/mobile nativa después.
ADR-B  Sync bancaria: proveedor por definir. Plaid no cubre Bolivia hasta donde sé;
       el MVP usa captura manual + CSV/OFX y deja el adapter listo.
ADR-C  Moneda base por defecto: BOB (el plan ya usa BOB en sus ejemplos).
ADR-D  Proveedor de IA (adapter) y política de privacidad de prompts.
ADR-E  Auth: Supabase Auth vs Auth.js.
```

---

# 158. PLAN DE ITERACIONES PARA ANTIGRAVITY + CLAUDE

Regla base (sección 126): **1 fase, 5–15 tasks, `converge`, y se continúa.**
Una *iteración* = una sesión de trabajo con un entregable verificable.
Las cantidades son estimaciones (±20 %).

## 158.1 Bloque I — Documentación y bases: 10 iteraciones

| It. | Objetivo | Entregables | Criterio de salida |
|---|---|---|---|
| **I0** | Kickoff | `specify init`, constitution v1 (P1–P15), esqueleto del repo, logo en `brand/` | Constitution aprobada |
| **I1** | Dominio | `glossary.md`, `invariants.md`, `financial-model.md`, rounding y error model | Invariantes numeradas y sin ambigüedad |
| **I2** | Arquitectura | `architecture.md`, ADR-A…E, límites de módulos, diagramas Mermaid, seguridad/RLS | ADRs decididos |
| **I3** | Design system | Spec 00b completo, `packages/design-tokens`, test de contraste en CI | Tokens + 3 estilos + CalcInput especificados |
| **I4** | Roadmap | Spec 00 (spec of specs), trazabilidad, IDs de requisitos, corte de MVP | Mapa canónico (157.3) firmado |
| **I5** | Datos | ERD completo, esquema Drizzle base, políticas RLS, seed | Migraciones corren en limpio |
| **I6** | Fundación en código | Monorepo, lint, CI, Vitest/Playwright, `packages/money` + parser CalcInput, `GlassCard` y `CalcInput` base | CI verde, property tests del parser |
| **I7** | Specs lote A | SPEC 01–05 con `specify→clarify→plan→checklist→tasks→analyze` | `analyze` sin críticos |
| **I8** | Specs lote B | SPEC 06–12 y 25 | `analyze` sin críticos |
| **I9** | Specs lote C + congelación | SPEC 13–24 (spec+plan+tasks base; detalle just-in-time), `analyze` global, tag `docs-v1.0` | Trazabilidad 100 % requisito↔tarea |

Paralelismo seguro: I3 puede correr junto a I1–I2 (tokens no dependen del dominio).
Ahorro posible: fusionar I1+I2 solo si se acepta menos revisión de ADRs (queda en 9).

## 158.2 Bloque II — Construcción core (≈16 iteraciones, M1–M5)

| Milestone | Iteraciones | Reparto |
|---|---:|---|
| M1 Ledger MVP | 4 | Identity · Budgets+Categories+Accounts · Transactions+Payees · Splits+Transfers+Home (shell action-first) |
| M2 Budget Engine | 3 | Motor puro + property tests · DB/API · UI de presupuesto (rollover, overspending) |
| M3 Goals + Cards + Scheduled | 3 | Goals · Credit cards · Scheduled + converge |
| M4 Reconciliation + Imports | 3 | Reconciliation · CSV/OFX · Matching + dedup |
| M5 Reports + Collaboration | 2 | Reports · Collaboration + Search/Palette/Notifications |
| Hardening core | 1 | Seguridad, RLS, a11y, performance, backup |

**Primera versión usable (M1 + M2): iteración ≈ 17 del total.**

## 158.3 Bloque III — Diferenciación (≈19 iteraciones, M6–M15)

| Milestone | Iteraciones |
|---|---:|
| M6 Advanced Goals | 1 |
| M7 Multi-currency + Shared Expenses | 3 |
| M8 Assets + Net Worth | 1 |
| M9 Debt Planner | 1 |
| M10 AI Categorization (incluye base de Agentic UX) | 2 |
| M11 Receipt OCR | 1 |
| M12 Finance Copilot | 2 |
| M13 Automations + Smart Alerts | 2 |
| M14 Offline-first | 2 |
| M15 Gamification + Analytics | 2 |
| Hardening final | 2 |

## 158.4 Total

```text
Bloque I    Documentación y bases     10
Bloque II   Core (M1–M5 + hardening)  16
Bloque III  Diferenciación            19
                                      ──
TOTAL                                 ≈ 45 iteraciones
```

## 158.5 Ciclo dentro de cada iteración de construcción

```text
1. analyze  (¿la spec sigue coherente?)
2. implement (5–15 tasks)
3. tests (unit + integración; property en motores financieros)
4. converge
5. revisión: DoD (84 + 58B.5), seguridad, UX, accesibilidad
6. commit + tag del milestone
```

No paralelizar Budget Engine, Credit Card Engine y Transaction Engine (comparten invariantes).

---
# 159. CONVENCIONES DE GIT Y COMMITS AUTOMÁTICOS

> Sección nueva. Pegar al final del plan (después de la sección anterior).
> Los cambios menores en secciones existentes están en la sección **159.9**.

## 159.1 Formato obligatorio

```text
<tipo>(<alcance>): <descripción en imperativo, inglés>
```

Reglas de la línea de asunto:

- Descripción **en inglés**, modo **imperativo** ("add", no "added" ni "adds").
- Minúscula inicial, **sin punto final**.
- Máximo **72 caracteres** en total.
- Breve: qué cambia, no cómo.

Ejemplos generales:

```text
feat(ws): add JWT authentication to websocket handshake
fix(auth): correct password verification for long passwords
docs(wiki): update plan with postgresql migration
chore(deps): bump fastapi to 0.115.5
test(users): add edge case for invalid object id
refactor(services): extract user repository to dedicated module
```

Ejemplos del dominio Bolsilludo:

```text
feat(money): add recursive descent parser for CalcInput
feat(tx): add split transaction validation
fix(engine): correct rollover for negative category balance
test(engine): add property test for ready-to-assign invariant
refactor(cards): extract payment availability to pure function
feat(db): add category_months migration
docs(specs): add spec and plan for 03-accounts
chore(ci): add contrast check for design tokens
feat(ui): add GlassCard with opaque fallback
```

## 159.2 Tipos permitidos

| Tipo | Uso |
|---|---|
| `feat` | Funcionalidad nueva |
| `fix` | Corrección de bug |
| `docs` | Documentación, specs, ADRs, glosario |
| `test` | Añadir o corregir tests |
| `refactor` | Cambio interno sin alterar comportamiento |
| `perf` | Mejora de rendimiento |
| `style` | Formato, sin cambio de lógica |
| `build` | Sistema de build, monorepo, empaquetado |
| `ci` | Pipelines y workflows |
| `chore` | Mantenimiento, dependencias, configuración |
| `revert` | Revertir un commit previo |

## 159.3 Alcances (scopes) permitidos

Un alcance por commit. Se alinean con módulos (sección 93) y specs (157.3).

```text
Dominio:      auth · identity · budget · category · accounts · tx · payees
              engine · goals · cards · recon · imports · sched · rules
              reports · collab · fx · shared · assets · debt
              ai · ocr · copilot · automation · alerts · offline
              gamification · analytics · search · notifications · audit
Plataforma:   db · api · money · ui · tokens · ux · brand · i18n
Repo:         specs · adr · docs · ci · deps · config · repo · seed
```

Regla: si un cambio toca dos alcances de dominio, probablemente son **dos commits**.
Alcance nuevo → se añade a esta lista en el mismo PR (commitlint lo valida).

## 159.4 Cuerpo y pie (opcionales)

Solo cuando aporten valor. Ejemplo:

```text
feat(tx): add split transaction validation

Reject saves when sum(splits) != parent amount (I1).

Refs: T014, FR-TRX-003
```

- Cuerpo: el **porqué**, en inglés, líneas ≤ 100 caracteres.
- Pie `Refs:` con IDs de task y de requisito (trazabilidad, sección 88).
- Cambio incompatible: `!` tras el alcance y pie `BREAKING CHANGE:`.
  Ejemplo: `feat(api)!: rename budgets endpoint to workspaces`.

## 159.5 Commits atómicos: cuándo dividir

Un commit = **un cambio lógico** que compila y pasa sus tests.

Dividir en varios commits cuando:

- mezcla **tipos** distintos (p. ej. `feat` + `refactor`);
- toca **alcances** distintos;
- supera ~**10 archivos** o ~**400 líneas** cambiadas;
- incluye migración + lógica + UI (van separados, en ese orden).

Orden recomendado dentro de una user story:

```text
1. feat(db):     migration and schema
2. feat(engine): pure domain function
3. test(engine): unit and property tests
4. feat(api):    command and query handlers
5. feat(ui):     screen or component
6. docs(specs):  mark tasks done, update traceability
```

Ejemplo real de una task grande dividida ("T021 Implement transfers"):

```text
feat(db): add transfer_group_id to transactions
feat(tx): add transfer pair calculation
test(tx): add property test for transfer symmetry
feat(api): add transferMoney command
feat(ui): add transfer sheet with CalcInput
```

## 159.6 Automatización: commit y push tras cada tarea

El agente (Antigravity + Claude) **commitea y sube automáticamente** siguiendo este ciclo.
Extiende la sección 158.5.

```text
Por cada task del tasks.md (formato T### de la sección 127):

1. Implementar la task.
2. Ejecutar lint + typecheck + tests del paquete afectado.
   └─ Si algo falla: corregir. NO commitear en rojo.
3. Marcar la task como [X] en tasks.md.
4. git add solo los archivos de esa task (nunca `git add .` a ciegas).
5. git commit con formato (159.1 (dividir según (159.5).
6. git push a la rama de trabajo.

Al cerrar una iteración (después de converge):
7. Verificar CI verde.
8. Commit final: docs(specs): converge <spec-id> and update traceability
9. git tag del hito ((159.8) y push del tag.
```

Frecuencia de push:

| Momento | Acción |
|---|---|
| Cada task completada y verde | commit + push |
| Cada fase de 5–15 tasks | push (ya hecho) + verificar CI |
| Cierre de iteración / milestone | tag + push del tag |

Mensaje de commit ≠ changelog: el changelog se genera a partir de los commits.

## 159.7 Ramas y protecciones

```text
main                   siempre desplegable; protegida
dev                    rama de trabajo; integración de iteraciones
```

Flujo de ramas:

1. El agente hace **push automático a `dev`** tras cada task verde.
2. **Al terminar una iteración** (sección 158.5, paso 7–9):
   - Verificar CI verde en `dev`.
   - Crear un **Pull Request** de `dev` → `main` con descripción de la iteración.
   - El dueño revisa y aprueba.
   - Merge con estrategia **rebase + merge** para conservar el historial de commits atómicos.
   - Taggear el milestone en `main` y hacer push del tag.

- Prohibido: `git push --force` sobre ramas compartidas, `--no-verify`,
  reescribir historia ya subida.
- Prohibido commitear: `.env`, credenciales, tokens, payloads bancarios reales,
  datos financieros de usuarios, imágenes de recibos.
- Migraciones ya aplicadas **no se editan**: se crea una nueva (sección 101).
- `main` solo recibe PRs aprobadas por el dueño (coherente con P7/P15: el agente propone, el humano decide).



## 159.9 Validación automática

Herramientas (se configuran en la iteración I6):

```text
commitlint   valida el formato del mensaje (hook commit-msg)
husky        ejecuta hooks locales (pre-commit: lint + typecheck rápido)
CI           re-valida commitlint sobre todos los commits del PR
```

`commitlint.config.js` (base):

```js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat','fix','docs','test','refactor','perf',
      'style','build','ci','chore','revert'
    ]],
    'scope-empty': [2, 'never'],
    'scope-enum': [2, 'always', [
      'auth','identity','budget','category','accounts','tx','payees',
      'engine','goals','cards','recon','imports','sched','rules',
      'reports','collab','fx','shared','assets','debt',
      'ai','ocr','copilot','automation','alerts','offline',
      'gamification','analytics','search','notifications','audit',
      'db','api','money','ui','tokens','ux','brand','i18n',
      'specs','adr','docs','ci','deps','config','repo','seed','ws','wiki'
    ]],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72]
  }
};
```

## 159.10 Cambios a secciones existentes

Aplicar estas ediciones puntuales al resto del plan:

**a) Sección 6 — Constitution.** Añadir al final de los principios:

```text
### P16 — Conventional Commits & Traceable History

Todo cambio se registra con commits atómicos en formato
`<tipo>(<alcance>): <descripción en imperativo, inglés>` (sección 159).
El agente commitea y sube tras cada task verde, solo a ramas de trabajo;
`main` se protege y se integra por PR. Nunca se commitean secretos ni datos reales.
```

**b) Sección 129 — Prompt de la Constitution.** Añadir la línea:

```text
- conventional commits with atomic, traceable history
```

**c) Sección 58B.5 — Definition of Done adicional.** Añadir:

```text
[ ] Commits atómicos en formato 159.1, pusheados y con CI verde
[ ] Tasks marcadas [X] y referenciadas en `Refs:` cuando aplique
```

**d) Sección 84 — Definition of Done → Technical.** Añadir:

```text
- commits follow section 159;
- commitlint passes locally and in CI.
```

**e) Sección 158.1 — Bloque I.** En **I0** añadir entregable:
`sección 159 adoptada (P16)`. En **I6** añadir entregable:
`commitlint + husky + regla de scopes en CI`.

**f) Sección 158.5 — Ciclo por iteración.** Reemplazar el paso 6:

```text
6. commits atómicos + push a la rama de la iteración (159.6);
   al cerrar: tag del milestone y PR a main para aprobación del dueño
```

**g) Sección 157.1 — Cambios de esta versión.** Añadir:

```text
+ Convenciones de Git y commits automáticos   (159, P16)
```


**h) Sección 5 — Estructura del repositorio.** Añadir en la raíz:

```text
├── commitlint.config.js
├── .husky/
│   ├── commit-msg
│   └── pre-commit
```

**i) Sección 153 — Archivos finales.** Añadir:

```text
docs/git-conventions.md   (copia operativa de la sección 159)
```

## 159.11 Decisión abierta para el dueño

 PR por iteración, aprobación del dueño, rebase + merge.
