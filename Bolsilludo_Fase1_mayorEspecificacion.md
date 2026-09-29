# BOLSILLUDO — ESPECIFICACIÓN MAESTRA UNIFICADA (FASE 1)
## Paridad funcional YNAB + mejoras UX/UI + backend determinista · Specs 01–12 · Fase 2 e IA

> **Versión:** 2.0 (fusión) · **Fecha:** 2026-09-28 · **Estado:** propuesta para aprobación del dueño
> **Origen:** fusión de dos documentos: (1) *Especificaciones detalladas 01–12 v1.0* (base estructural: Parte A + Specs 01–04 con nivel de detalle
> completo) y (2) *Fase 1 — Especificación técnica profunda (paridad YNAB)* (reglas de dominio de Specs 05–12, IA y Fase 2).
> Lo repetido se dejó **una sola vez**; lo que estaba solo en uno de los dos se conservó. Los choques entre ambos se resolvieron
> y quedan listados en la **Parte Z** (ADR-M1…) para tu aprobación.
> **Propósito:** que una IA implemente con Spec Kit **sin improvisar reglas financieras**. Se pega por partes en
> `specs/NN-*/spec.md`, `plan.md` y `tasks.md` (ver Parte Y y Parte Z).
> **Referencia funcional:** comportamiento observable y documentación pública de soporte de YNAB (a sept. 2026). No se copia código ni
> implementación privada; donde YNAB no documenta algo, se marca 🟨 y se decide aquí.

## Índice

| Parte | Contenido | Origen |
|---|---|---|
| **0** | Cómo usar el documento, leyenda, reglas de oro, estado del repo, fuentes | Plan 1 (+ reglas del Plan 2) |
| **A** | Fundamentos transversales: glosario, dinero, fechas, IDs, **fórmulas canónicas**, errores, auditoría, backend, UI, pruebas, bugs típicos, principios de dominio, infraestructura | Plan 1 + aportes del Plan 2 |
| **Specs 01–04** | Identity · Budgets & Categories · Accounts · Transactions (incluye splits, transferencias, payees) | Plan 1 (detalle completo) + enmiendas del Plan 2 |
| **Parte B** | **Specs 05–12**: Motor de presupuesto (+Auto-Assign) · Metas · Tarjetas (+Préstamos) · Conciliación · Importación · Programadas · Reportes · Colaboración | Plan 2, con la estructura de 12 secciones del Plan 1 |
| **Parte C** | Fase 2 y capa de IA (multi-moneda, gastos compartidos, activos, deuda, IA, OCR, automatización, alertas, offline, gamificación) | Plan 2 (sin duplicados) |
| **Parte N** | Escenarios dorados GS-xx (datos de prueba exactos) | Plan 2 (E2E/bug tests) |
| **Parte Y** | Proceso Spec Kit, Definition of Done, orden de implementación, puertas de release, checkpoints | Plan 2 |
| **Parte Z** | ADR de fusión, mapa de qué se unificó/descartó, referencias oficiales | Nuevo |

---

# 0. CÓMO USAR ESTE DOCUMENTO

## 0.1 Leyenda de marcadores

| Marcador | Significado |
|---|---|
| 🟦 **YNAB** | Comportamiento de YNAB verificado en su documentación pública de soporte. |
| 🟩 **MEJORA** | Lo que Bolsilludo hace mejor o distinto (diferenciación dentro de la Fase 1). |
| 🟨 **DECISIÓN** | Regla canónica propuesta por nosotros porque YNAB no la documenta o hay varias opciones. Requiere aprobación del dueño (se listan en la Parte Z como ADR-G1…). **La IA no puede cambiarlas sin ADR.** |
| 🟥 **NO HACER** | Prohibición explícita (fuente habitual de bugs). |

## 0.2 Reglas de oro para la IA implementadora

1. **Lee la Parte A completa antes de tocar código.** Define dinero, fechas, signos, fórmulas canónicas, errores y bugs típicos. Todas las specs dependen de ella.
2. **Una sola fuente de verdad por dato.** Nunca guardes un valor derivable (saldos, disponible, RTA) en dos sitios. Si se cachea, la BD sigue mandando (plan §95).
3. **Toda cifra financiera sale de funciones puras** en `packages/*` (sin React, sin BD). La UI y las acciones solo llaman y muestran.
4. **Dinero = entero en unidades menores** (`amount_minor`, BIGINT) + `currency`. Prohibido `float`, `Number` con decimales y `eval`.
5. **Nada se borra físicamente** en datos financieros: se anula (`voided_at`) o archiva (`archived_at`).
6. **Cada comando** corre en **una transacción de BD**, valida con Zod, verifica membresía/rol, escribe `audit_events` y devuelve un `Result` tipado (no lanza excepciones para errores esperados).
7. **Cada tabla con datos de usuario tiene RLS activado** y `budget_id` (denormalizado) para poder aplicar la política.
8. **Escribe primero los tests de las fórmulas** usando los *golden scenarios* de la Parte N y los property tests indicados; después el código.
9. **No implementes nada fuera del spec en curso.** Si falta una decisión, propón 2 opciones con recomendación (plan §159 del prompt maestro) y espera.
10. **Commits atómicos** según la sección 159 del plan (`<tipo>(<alcance>): <descripción en imperativo, inglés>`), push a `dev` tras cada task verde.
11. **UNA definición, UN motor, MUCHAS presentaciones.** Prohibido que Inicio, Presupuesto y Tarjetas calculen Por asignar / pago de tarjeta cada uno a su manera.
12. **La UI muestra valores financieros pero no los calcula.** Permitido: `ancho de barra = progressRatio` (que ya viene en el DTO). Prohibido: `rta = saldo − asignado` en JSX.
13. **Antes de tocar código financiero:** lee la constitución, el spec objetivo, las invariantes y los specs dependientes; busca implementaciones existentes; identifica la fuente de verdad; **no inventes reglas** y reporta cualquier ambigüedad en vez de elegir en silencio (ver Parte Y, prompt de implementación).
14. **No se empieza IA, OCR ni UX agéntica** hasta que pasen las pruebas de RTA, arrastre, tarjeta, conciliación, transferencia, split, meta e importación (Parte Y). Una IA sobre un ledger incorrecto solo automatiza errores.
15. **Ante un bug financiero se investiga desde el dominio, no desde React** (orden en A11.2).

## 0.3 Estado actual detectado en el repo

| Spec | Carpeta | Estado | Problema principal |
|---|---|---|---|
| 01 | `01-identity` | Solo esqueleto (T01.1–T01.5 sin marcar) | Sin flujos, sin RLS, sin estados de UI, webhooks frágiles |
| 02 | `02-workspaces-budgets` | Solo esqueleto | Sin reglas de categorías, sin mover dinero, sin plantillas |
| 03 | `03-accounts` | Solo esqueleto | Saldos como columnas (riesgo de deriva), sin estados |
| 04 | `04-transactions` | Solo esqueleto | Sin ciclo de vida, sin bloqueo por conciliación, sin payees |
| 05 | `05-budget-engine` | **Motor puro hecho** (T001–T006 ✅) | Falta orquestador con BD, tarjetas, metas, UI de presupuesto |
| 06–12 | resto | Solo esqueleto | Sin algoritmos, sin ejemplos numéricos |

> **Compatibilidad con lo ya implementado:** `packages/budget-engine` (`calculateMonthState`,
> `calculateCategoryState`, `calculateRTA`) **no se reescribe**: se **extiende** (Spec 05, sección 05.6).
> Los tests existentes deben seguir pasando.

## 0.4 Estructura fija de cada SPEC en este documento

```text
NN.1  Cómo funciona YNAB (🟦)          → contexto funcional
NN.2  Qué hará Bolsilludo               → paridad (🟦) + mejoras (🟩) + decisiones (🟨)
NN.3  Requisitos funcionales (FR-*)     → IDs estables
NN.4  Reglas de negocio (BR-*)          → numeradas, testeables
NN.5  Modelo de datos                   → columnas, tipos, constraints, índices, RLS
NN.6  Backend: comandos y queries       → firma, validaciones, errores, efectos, auditoría
NN.7  UI: pantallas, componentes, estados, atajos, textos
NN.8  Casos borde
NN.9  Criterios de aceptación (Given/When/Then)
NN.10 Tests requeridos
NN.11 Tasks atómicas (con commit sugerido)
NN.12 No hacer
```

## 0.5 Fuentes consultadas (YNAB)

Documentación pública de soporte de YNAB, consultada el 2026-09-28: Targets (`support.ynab.com/en_us/getting-started-with-targets-ryAEP08xC`,
`how-to-use-targets-rk5kkI9ks`), Credit Cards (`handling-credit-cards-overview-ry7cNub1s`,
`credit-card-overspending-an-overview-HkMGpSbJs`, `float-BytrIDZJi`, `when-your-credit-card-payment-category-is-red-a-guide-SJDSr3Q1i`,
`credits-cards-with-a-positive-balance…`), Reconciliation (`reconciling-accounts-a-guide-BJFE3fHys`,
`balance-adjustments-a-guide-rko4OwILs`), Age of Money (`age-of-money-H1ZS84W1s`), Account types
(`account-types-an-overview-BkmGM0qCq`), Glossary (`ynab-glossary-a-guide-BJd80SORq`), Cash
(`handling-cash-in-ynab-a-guide-BJVYYkXR9`) y el blog "Five-Minute YNAB Routine". Donde la documentación no
llega, se marca 🟨 y se decide aquí.

## 0.6 Numeración y referencias cruzadas

- La numeración de specs es la del repo: `01-identity` · `02-workspaces-budgets` · `03-accounts` · `04-transactions` · `05-budget-engine` · `06-goals` · `07-credit-cards` · `08-reconciliation` · `09-imports` · `10-scheduled` · `11-reports` · `12-collaboration`.
- **Todas las specs (01–12) usan las mismas 12 secciones** `NN.1 … NN.12` (ver 0.4). Por eso las referencias del tipo *"07.4 BR-CC-030"*, *"08.4 BR-REC-010"*, *"10.5"* o *"11.6"* apuntan a la sección correspondiente en la Parte B.
- Las Specs 01–04 tienen el detalle completo (SQL, Given/When/Then, tasks con commit). Las Specs 05–12 (Parte B) incorporan **todas las reglas de dominio** del plan profundo; donde aún no llegan a ese nivel de detalle lo indican en su cabecera y se completan con `/speckit.clarify` (Parte Y).
- Los textos entre `plan §NN` remiten al **plan maestro/constitución** (documentos aparte, no incluidos aquí).

---

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

# SPEC 01 — IDENTITY & PROFILES

**Dependencias:** ninguna (primer spec de producto). **Hito:** M1. **Prefijo de IDs:** `FR-IDN`, `BR-IDN`.

## 01.1 Cómo funciona YNAB (🟦)

- Acceso con **correo y contraseña** y con inicio de sesión de **Google/Apple (SSO)**; verificación en dos pasos opcional.
- El usuario tiene **ajustes de cuenta** (correo, contraseña, seguridad, exportar/eliminar datos) separados de los **ajustes del plan** (formato de moneda, fecha y número).
- Tras registrarse, el usuario crea su primer plan y agrega cuentas; el onboarding es un asistente por pasos con preguntas iniciales para proponer categorías.
- El plan pertenece a la cuenta que lo creó y puede compartirse (Spec 12).

## 01.2 Qué hará Bolsilludo

| Capacidad | Tipo | Nota |
|---|---|---|
| Registro/login/logout/reset/verificación por correo | 🟦 paridad | Supabase Auth (ADR-E pendiente: si se elige Auth.js, la spec se mantiene; cambia la infraestructura) |
| Login con Google | 🟦 paridad | Detrás de feature flag `AUTH_GOOGLE` |
| Verificación en dos pasos (TOTP) + códigos de recuperación | 🟦 paridad / 🟩 | Flag `AUTH_MFA`; opcional para el usuario |
| Perfil: nombre, avatar, `locale`, `timezone`, moneda base preferida, formato de fecha/número, tema | 🟦 paridad | Preferencias **por usuario**; la moneda del presupuesto se fija en el presupuesto (Spec 02) |
| Sesiones/dispositivos: ver y revocar | 🟩 mejora | Plan §72 |
| Onboarding orientado a acciones (≤ 5 min hasta el primer presupuesto usable) | 🟩 mejora | Plan §109 (elige objetivo, monto disponible, dónde está, pagos conocidos) |
| Exportar mis datos / eliminar cuenta | 🟩 mejora | Plan §114 (solicitud + período de gracia) |
| 🟨 Perfil creado por **trigger de BD** al insertar en `auth.users` | Decisión ADR-G5 | Reemplaza el "webhook de sincronización" del plan original: es atómico y no depende de red |

## 01.3 Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-IDN-001 | Un visitante puede registrarse con correo y contraseña. |
| FR-IDN-002 | El sistema envía un correo de verificación; sin verificar no se puede crear un presupuesto. |
| FR-IDN-003 | Un usuario verificado puede iniciar y cerrar sesión; la sesión persiste entre visitas (renovación automática). |
| FR-IDN-004 | Un usuario puede solicitar restablecer contraseña por correo y definir una nueva mediante un enlace de un solo uso. |
| FR-IDN-005 | Un usuario puede editar nombre, avatar, `locale`, `timezone`, moneda preferida, formato de fecha/número y tema. |
| FR-IDN-006 | Un usuario puede cambiar contraseña y correo (con reautenticación reciente). |
| FR-IDN-007 | Un usuario puede activar/desactivar TOTP y generar códigos de recuperación (flag). |
| FR-IDN-008 | Un usuario puede ver sus sesiones/dispositivos y cerrar una o todas las demás. |
| FR-IDN-009 | Un usuario nuevo completa un onboarding guiado que termina con un presupuesto creado (Spec 02). |
| FR-IDN-010 | Un usuario puede solicitar la exportación de sus datos y la eliminación de su cuenta. |
| FR-IDN-011 | Las rutas privadas redirigen a login si no hay sesión y regresan al destino original tras autenticar. |

## 01.4 Reglas de negocio

| ID | Regla |
|---|---|
| BR-IDN-001 | Correo: `trim` + minúsculas; único (case-insensitive); máx. 254 caracteres; formato validado por Zod (`z.string().email()`) y por el proveedor. |
| BR-IDN-002 | Contraseña: **mín. 10** caracteres; validada en cliente y servidor; no puede ser igual al correo ni estar en una lista de las 10 000 más comunes. |
| BR-IDN-003 | Contraseña: máx. **72 bytes UTF-8** (límite de bcrypt). Si excede, se **rechaza con mensaje claro** (nunca truncar en silencio). |
| BR-IDN-004 | `timezone` debe ser un identificador IANA válido (`Intl.supportedValuesOf('timeZone')`). Defecto: la detectada por el navegador; si falla, `America/La_Paz`. |
| BR-IDN-005 | `locale` ∈ {`es-BO`(defecto), `es-419`, `es-ES`, `en-US`}. Solo `es-BO` tiene textos completos en Fase 1; los demás caen a `es-BO`. |
| BR-IDN-006 | Moneda preferida ∈ `currencies` activas. Defecto `BOB` (ADR-C). Solo sugiere la moneda al crear presupuestos. |
| BR-IDN-007 | Verificación de correo: enlace válido 24 h, un solo uso. Reset de contraseña: válido 1 h, un solo uso; al usarse se invalidan **todas** las sesiones. |
| BR-IDN-008 | Sesión: el token de acceso se renueva de forma transparente; sesión inactiva > 30 días expira. Cierre de sesión invalida el refresh token. |
| BR-IDN-009 | Rate limit: **5 intentos de login fallidos / 15 min por (correo+IP)**; 3 solicitudes de reset / hora por correo; 5 registros / hora por IP. Superado → `RATE_LIMITED`. |
| BR-IDN-010 | **Anti-enumeración:** login fallido siempre devuelve `INVALID_CREDENTIALS`; "olvidé mi contraseña" siempre responde con el mismo mensaje exista o no el correo; el registro con correo existente responde igual que uno nuevo ("Revisa tu correo") y envía un aviso al dueño real. |
| BR-IDN-011 | Acciones sensibles (cambiar correo/contraseña, desactivar MFA, eliminar cuenta, exportar) exigen **reautenticación reciente (< 10 min)**. |
| BR-IDN-012 | Cambio de correo: se confirma en **ambos** correos (actual y nuevo); hasta confirmar sigue vigente el actual. |
| BR-IDN-013 | Google: se vincula a una cuenta existente **solo** si el correo está verificado por el proveedor; si no, se rechaza (evita toma de cuenta). |
| BR-IDN-014 | Eliminar cuenta: período de gracia de 14 días (cancelable). Si el usuario es **único OWNER** de un presupuesto con otros miembros, debe transferir la propiedad o eliminar el presupuesto antes. Tras la gracia: anonimiza el perfil y purga datos según Spec 12/plan §114; los eventos de auditoría conservan `actor_user_id` seudonimizado. |
| BR-IDN-015 | Recuperación TOTP: 10 códigos de un solo uso, mostrados **una sola vez**, almacenados con hash. |
| BR-IDN-016 | Un usuario no verificado solo puede ver `/verify-email` y cerrar sesión. |

## 01.5 Modelo de datos

```sql
-- auth.users lo gestiona Supabase. profiles es 1:1.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  avatar_path text,                                         -- Supabase Storage (bucket privado 'avatars')
  locale text not null default 'es-BO',
  timezone text not null default 'America/La_Paz',
  preferred_currency char(3) not null default 'BOB' references currencies(code),
  date_format text not null default 'DD/MM/YYYY' check (date_format in ('DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD')),
  number_format text not null default 'es' check (number_format in ('es','en','space')), -- 1.234,56 | 1,234.56 | 1 234,56
  first_day_of_week smallint not null default 1 check (first_day_of_week in (0,1)),
  theme text not null default 'system' check (theme in ('dark','light','system')),
  simple_mode boolean not null default true,                -- Modo simple/avanzado (plan §107)
  gamification_enabled boolean not null default true,
  last_budget_id uuid,                                      -- FK diferida a budgets (Spec 02)
  onboarding jsonb not null default '{"step":"welcome"}',   -- ver 01.6.6
  onboarding_completed_at timestamptz,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1
);

-- Perfil automático (ADR-G5)
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create table user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,                       -- "Chrome en Windows"
  user_agent_hash text not null,
  last_seen_at timestamptz not null default now(),
  last_ip_hash text,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index on user_devices (user_id, last_seen_at desc);

create table rate_limits (
  bucket text not null,                      -- 'login:{email}:{ip_hash}' | 'reset:{email}' | ...
  window_start timestamptz not null,
  count int not null default 1,
  primary key (bucket, window_start)
);

create table account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  execute_after timestamptz not null,        -- requested_at + 14 días
  cancelled_at timestamptz
);

create table mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
```

**RLS:** `profiles` — `select`/`update` solo `id = auth.uid()`. `user_devices`, `mfa_recovery_codes`, `account_deletion_requests`: solo el propio `user_id`. `rate_limits`: solo rol de servicio.
**Storage:** bucket `avatars` privado; política: solo el dueño lee/escribe `avatars/{user_id}/*`; máx. 2 MB, `image/png|jpeg|webp`.

## 01.6 Backend

### 01.6.1 Middleware y guardas de ruta

Orden de evaluación en `middleware.ts` (con `@supabase/ssr`, refresca cookies en cada request):

| Estado del visitante | Ruta pedida | Resultado |
|---|---|---|
| Sin sesión | privada | 302 → `/login?next=<ruta>` (validar `next` como ruta interna: empieza con `/`, no con `//`, sin esquema) |
| Sesión, correo **no** verificado | cualquiera privada | 302 → `/verify-email` |
| Sesión verificada, onboarding incompleto | cualquiera de `/b/**` | 302 → `/onboarding` |
| Sesión completa | `/login`, `/register` | 302 → `/b` |
| Cualquiera | `/invite/[token]` | Permitida (Spec 12 decide) |

### 01.6.2 Comandos

| Comando | Entrada (Zod) | Efecto | Errores | Auditoría |
|---|---|---|---|---|
| `register` | `email`, `password`, `displayName?`, `acceptTerms: true` | `supabase.auth.signUp`; envía verificación | `VALIDATION_FAILED`, `WEAK_PASSWORD`, `RATE_LIMITED` (siempre respuesta neutra, BR-IDN-010) | `user.registered` |
| `login` | `email`, `password`, `next?` | `signInWithPassword`; si MFA activo → paso TOTP | `INVALID_CREDENTIALS`, `RATE_LIMITED` | `user.login` (device) |
| `logout` | `scope: 'local'|'global'` | `signOut` | – | `user.logout` |
| `requestPasswordReset` | `email` | envía correo si existe | siempre OK | `user.reset_requested` (solo si existe) |
| `resetPassword` | `password` (sesión de recuperación) | `updateUser`, invalida sesiones | `WEAK_PASSWORD`, token vencido | `user.password_reset` |
| `resendVerification` | – | reenvía (máx. 3/h) | `RATE_LIMITED` | – |
| `updateProfile` | campos de `profiles` + `version` | `UPDATE … WHERE version=:v` | `VALIDATION_FAILED`, `CONFLICT_VERSION` | `profile.updated` |
| `changePassword` | `current`, `next` | reauth + `updateUser` | `INVALID_CREDENTIALS`, `WEAK_PASSWORD` | `user.password_changed` |
| `changeEmail` | `newEmail` | doble confirmación | `VALIDATION_FAILED` | `user.email_change_requested` |
| `mfa.enroll/verify/disable` | TOTP | Supabase MFA; genera recovery codes | código inválido | `user.mfa_*` |
| `listSessions` / `revokeSession` / `revokeOthers` | – / `deviceId` | `signOut({scope:'others'})` | – | `user.session_revoked` |
| `requestDataExport` | – | encola job → ZIP (JSON+CSV) en Storage con URL firmada 24 h | `RATE_LIMITED` (1/día) | `user.export_requested` |
| `requestAccountDeletion` / `cancelAccountDeletion` | password (reauth) | fila con `execute_after` | `LAST_OWNER_CANNOT_LEAVE` | `user.deletion_*` |
| `advanceOnboarding` | `step`, `payload` | actualiza `profiles.onboarding` | `VALIDATION_FAILED` | `onboarding.step` |

### 01.6.3 Queries
`getMe()` → `{ id, email, emailVerified, mfaEnabled, profile }`. `getSessions()`. `getOnboardingState()`.

### 01.6.4 Job diario `execute_account_deletions`
Selecciona `execute_after <= now() AND cancelled_at IS NULL`; ejecuta la purga por usuario en transacción; idempotente por `user_id`.

### 01.6.5 Correos transaccionales
Plantillas en español (verificación, reset, cambio de correo, aviso "intentaron registrar tu correo", invitación en Spec 12). Sin datos financieros en correos. Enlaces con `redirect_to` a `/auth/callback`.

### 01.6.6 Estado de onboarding (`profiles.onboarding`)

```jsonc
{
  "step": "welcome|profile|budget|accounts|commitments|done",
  "intent": "control_spending|save|pay_debt|organize_accounts|build_wealth",   // paso "welcome"
  "budgetId": "uuid|null",
  "available": { "amountMinor": "72000", "currency": "BOB" },                    // "¿cuánto dinero tienes disponible?"
  "commitments": [ { "name": "Alquiler", "amountMinor": "100000", "dueDay": 5 } ]
}
```

Transiciones válidas: `welcome → profile → budget → accounts → commitments → done` (se puede retroceder). `done` exige presupuesto y ≥ 1 cuenta (u omisión explícita "Lo haré después").

## 01.7 UI

### 01.7.1 Layout de pantallas de acceso
Fondo `--bg` navy con `GlassCard` centrada (máx. 420 px), logo SVG arriba, título, formulario, enlaces secundarios. Tema oscuro por defecto. Sin blur si `prefers-reduced-transparency`.

### 01.7.2 `/register`
Campos: **Nombre** (`autocomplete="name"`, opcional), **Correo** (`type="email"`, `autocomplete="email"`, `inputmode="email"`), **Contraseña** (`autocomplete="new-password"`, botón ojo con `aria-pressed`), casilla **Términos y privacidad** (obligatoria). Indicador de fortaleza (texto + barra, no solo color): "Débil / Aceptable / Fuerte".
Validación **al perder foco y al enviar**; mensajes:

| Caso | Texto |
|---|---|
| Correo vacío | "Escribe tu correo." |
| Correo inválido | "Revisa tu correo (ej.: nombre@correo.com)." |
| Contraseña < 10 | "Usa al menos 10 caracteres." |
| Contraseña > 72 bytes | "La contraseña es demasiado larga (máx. 72 bytes). Usa una más corta." |
| Éxito | Pantalla "Revisa tu correo" con botón "Reenviar" (cuenta atrás 60 s) y "Cambiar correo". |

Botón primario `Crear cuenta` (texto azul oscuro sobre esmeralda, ver 0.5.3). Estados: reposo, enviando (spinner + `aria-busy`, botón deshabilitado, **evita doble envío**), error global (`role="alert"`).

### 01.7.3 `/login`
Correo, contraseña, "¿Olvidaste tu contraseña?", botón Google (si flag). Error único: "Correo o contraseña incorrectos." Si MFA: segunda pantalla "Código de 6 dígitos" (`autocomplete="one-time-code"`, `inputmode="numeric"`) y enlace "Usar código de recuperación". Tras 5 fallos: "Demasiados intentos. Prueba en 15 minutos o restablece tu contraseña."

### 01.7.4 `/forgot-password` → `/reset-password`
Mensaje siempre: "Si el correo existe, te enviamos un enlace." Reset: dos campos (nueva y confirmar), mismas reglas; éxito → toast + redirige a `/login`.

### 01.7.5 `/verify-email`
Estado "Esperando verificación", botón reenviar (límite), botón "Ya verifiqué" (refresca sesión), "Cerrar sesión". Detección automática por `onAuthStateChange`.

### 01.7.6 `/onboarding` (asistente de 5 pasos, una pregunta por pantalla, barra de progreso con `aria-valuenow`)

| Paso | Pantalla | Controles | Se guarda |
|---|---|---|---|
| 0 Welcome | "¿Qué quieres conseguir?" | 5 tarjetas seleccionables (una) | `intent` |
| 1 Perfil | "Ajusta lo básico" | Nombre, zona horaria (autodetectada, editable), moneda | `profiles` |
| 2 Presupuesto | "¿Cuánto dinero tienes disponible?" | `CalcInput` monto; selector de plantilla de categorías (Vacío / Básico / Estudiante / Familia) | crea presupuesto (Spec 02) |
| 3 Cuentas | "¿Dónde está ese dinero?" | Lista rápida: agregar Efectivo/Cuenta bancaria con saldo (`CalcInput`) | cuentas (Spec 03) |
| 4 Compromisos | "¿Qué pagos ya sabes que tendrás?" | Filas: nombre + monto (`CalcInput`) + día del mes | categorías + metas mensuales (Spec 06) |
| 5 Listo | "Tu plan está listo" | Muestra **Por asignar** y botón "Asignar mi dinero" | `done` |

Reglas: "Omitir" disponible en pasos 3–4; retroceder no pierde datos; recargar retoma el paso guardado. Un usuario que cierra el navegador en el paso 2 encuentra su borrador al volver.

### 01.7.7 `/settings/profile` y `/settings/security` y `/settings/privacy`
- **Perfil:** avatar (recorte cuadrado), nombre, zona horaria (combobox buscable), formato de fecha/número con **vista previa en vivo** ("15/09/2026 · Bs 1.234,50"), tema (oscuro/claro/sistema), modo simple/avanzado, gamificación on/off.
- **Seguridad:** cambiar contraseña, cambiar correo, MFA (QR + código; códigos de recuperación con botón "Copiar/Descargar", advertencia "se muestran una sola vez"), lista de sesiones (dispositivo, último uso, "Esta sesión") con "Cerrar esta"/"Cerrar todas las demás".
- **Privacidad:** "Exportar mis datos", "Eliminar mi cuenta" (`ConfirmDialog` que exige escribir `ELIMINAR`; explica los 14 días).

### 01.7.8 Sincronización multi-pestaña
`BroadcastChannel('auth')` + `onAuthStateChange`: cerrar sesión en una pestaña cierra las demás en < 2 s.

## 01.8 Casos borde

- Doble clic en "Crear cuenta" → una sola solicitud (deshabilitar + `idempotency_key`).
- Enlace de verificación usado dos veces → mensaje "Este enlace ya se usó" + botón ir a login.
- Registro con correo ya existente → misma pantalla "Revisa tu correo" (BR-IDN-010).
- Correo con mayúsculas/espacios ("  Ana@Correo.com ") → normalizado.
- Sesión expira con un formulario a medias → guardar borrador en `sessionStorage` (solo datos no sensibles) y volver tras login.
- Contraseña con emoji/acentos y 72 bytes exactos → aceptada; 73 → rechazada.
- Usuario elimina cuenta y vuelve a registrarse con el mismo correo dentro de la gracia → se le ofrece cancelar la eliminación.
- Reloj del dispositivo desfasado → los tokens los valida el servidor; la UI no calcula expiraciones.
- Zona horaria no soportada por el navegador → `America/La_Paz`.
- Navegador sin JS → mensaje `<noscript>` (la app requiere JS).

## 01.9 Criterios de aceptación

```text
AC-IDN-01  Given un visitante con correo y contraseña válidos
           When envía el registro
           Then ve "Revisa tu correo", se crea profiles(1:1) y NO puede crear presupuesto hasta verificar.

AC-IDN-02  Given un correo ya registrado
           When alguien intenta registrarse con él
           Then la respuesta visible es idéntica a la de un correo nuevo y el dueño real recibe un aviso.

AC-IDN-03  Given credenciales inválidas (correo inexistente o contraseña mala)
           When intenta iniciar sesión
           Then ve exactamente "Correo o contraseña incorrectos." sin revelar cuál falló.

AC-IDN-04  Given 5 logins fallidos en 15 min
           When intenta el sexto
           Then recibe RATE_LIMITED aunque la contraseña sea correcta.

AC-IDN-05  Given un enlace de reset usado
           When se abre de nuevo
           Then muestra "El enlace ya se usó o venció" y permite pedir otro.

AC-IDN-06  Given una contraseña de 73 bytes
           When se envía
           Then se rechaza con el mensaje de longitud (no se trunca).

AC-IDN-07  Given un usuario verificado sin onboarding
           When entra a /b/xyz
           Then es redirigido a /onboarding en el paso guardado.

AC-IDN-08  Given un usuario que cambia su zona horaria y formato de fecha
           When guarda
           Then la vista previa coincide y los cambios persisten tras recargar (version incrementada).

AC-IDN-09  Given dos pestañas abiertas
           When cierra sesión en una
           Then la otra pasa a /login en < 2 s.

AC-IDN-10  Given un usuario único OWNER de un presupuesto compartido
           When solicita eliminar su cuenta
           Then recibe LAST_OWNER_CANNOT_LEAVE con acción "Transferir propiedad".

AC-IDN-11  Given otra sesión activa en otro dispositivo
           When pulsa "Cerrar todas las demás"
           Then esa sesión queda inválida y esta continúa.

AC-IDN-12  Given un usuario A autenticado
           When consulta profiles de B vía cliente Supabase
           Then obtiene 0 filas (RLS).
```

## 01.10 Tests requeridos

- **Unit:** validadores Zod (correo/contraseña/tz/locale), `normalizeEmail`, `isSafeNextPath` (casos: `//evil.com`, `/\evil`, `https://x`, `/b/1`), `byteLength(password)`.
- **Integración:** trigger crea `profiles`; RLS por tabla; rate limit (ventana deslizante con reloj inyectado); job de eliminación idempotente.
- **E2E (Playwright):** registro → verificación (interceptar correo con Inbucket local) → onboarding → presupuesto; login inválido; reset; logout multi-pestaña; revocar sesión.
- **A11y:** formularios con axe; navegación solo teclado; anuncio de errores por `aria-live`.

## 01.11 Tasks atómicas

- [ ] [T01.1] Levantar Supabase local y variables de entorno (`.env.example`, sin secretos). — `chore(config): add supabase local setup and env example`
- [ ] [T01.2] Migración `currencies` (BOB, USD, EUR con `minor_unit`) y seed. — `feat(db): add currencies table and seed`
- [ ] [T01.3] Migración `profiles` + trigger `handle_new_user` + RLS. — `feat(db): add profiles table with auto-creation trigger and rls`
- [ ] [T01.4] Migraciones `user_devices`, `rate_limits`, `account_deletion_requests`, `mfa_recovery_codes`. — `feat(db): add identity support tables`
- [ ] [T01.5] Zod schemas y validadores (`packages/validation`): correo, contraseña (72 bytes), tz, locale. — `feat(auth): add identity validation schemas`
- [ ] [T01.6] Test property/unit de validadores y `isSafeNextPath`. — `test(auth): add validator and safe redirect tests`
- [ ] [T01.7] Middleware de sesión y guardas (tabla 01.6.1). — `feat(auth): add session middleware and route guards`
- [ ] [T01.8] Server actions `register`, `login`, `logout` con rate limit y respuestas neutras. — `feat(auth): add register login logout actions`
- [ ] [T01.9] Reset de contraseña y verificación de correo (callback). — `feat(auth): add password reset and email verification`
- [ ] [T01.10] UI `/register` `/login` `/forgot-password` `/reset-password` `/verify-email` con estados A9.3. — `feat(ui): add auth screens`
- [ ] [T01.11] Perfil y preferencias (comando `updateProfile` con `version`) + UI `/settings/profile`. — `feat(auth): add profile and preferences settings`
- [ ] [T01.12] Onboarding: estado, comandos y UI de pasos 0–5. — `feat(ux): add onboarding wizard`
- [ ] [T01.13] Sesiones/dispositivos + revocación. — `feat(auth): add session management`
- [ ] [T01.14] MFA TOTP + códigos de recuperación (flag `AUTH_MFA`). — `feat(auth): add totp mfa with recovery codes`
- [ ] [T01.15] Exportar datos y eliminar cuenta (solicitud + job). — `feat(auth): add data export and account deletion requests`
- [ ] [T01.16] E2E Journey 1 (parte de identidad) y a11y de formularios. — `test(auth): add identity e2e and accessibility tests`

## 01.12 No hacer

🟥 Webhooks para crear el perfil · 🟥 mensajes de error que distingan "correo no existe" · 🟥 guardar contraseñas o tokens en logs/`localStorage` · 🟥 truncar contraseñas · 🟥 confiar en `next` sin validar · 🟥 permitir crear presupuestos sin correo verificado · 🟥 lógica de autorización solo en el frontend.

---

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

## 02.11 Tasks atómicas

- [ ] [T02.1] Migración `budgets`, `budget_members` + RLS + índices. — `feat(db): add budgets and members tables with rls`
- [ ] [T02.2] Migración `category_groups`, `categories`, `category_months`, `budget_movements` (FK compuestas, índices únicos parciales). — `feat(db): add category structure and monthly assignment tables`
- [ ] [T02.3] Drizzle schema + tipos + `requireMember(ctx,budgetId,minRole)`. — `feat(budget): add drizzle schema and membership guard`
- [ ] [T02.4] Plantillas JSON + `applyTemplate` puro + tests. — `feat(budget): add budget templates and template application`
- [ ] [T02.5] Comando `createBudget` (transacción única, idempotente) + tests de integración. — `feat(budget): add create budget command`
- [ ] [T02.6] Comandos `updateBudget`, `archive/restore/delete`, `duplicateBudgetStructure`, `switchBudget`. — `feat(budget): add budget lifecycle commands`
- [ ] [T02.7] Comandos de grupos y categorías (crear, renombrar, meta, ocultar). — `feat(category): add category and group commands`
- [ ] [T02.8] `reorderGroups/Categories` con reindexado denso + property test. — `feat(category): add dense reorder commands`
- [ ] [T02.9] `archiveCategory` + `budget_movements` (mover disponible a categoría o a Por asignar). — `feat(category): add archive with available money move`
- [ ] [T02.10] `previewMerge` y `mergeCategories`. — `feat(category): add category merge with impact preview`
- [ ] [T02.11] Query `getCategoryTree` y `listBudgets`. — `feat(budget): add category tree and budget list queries`
- [ ] [T02.12] UI: selector de presupuesto y `/b/new`. — `feat(ui): add budget switcher and creation screen`
- [ ] [T02.13] UI: editor de estructura (drag + teclado, ocultas, archivar, fusionar). — `feat(ui): add category structure editor`
- [ ] [T02.14] `getBudgetOverview` + registro de widgets + fuentes de atención (stubs por spec). — `feat(ux): add budget overview query and attention items`
- [ ] [T02.15] UI Inicio action-first (tarjetas, atención, estado vacío, modo simple). — `feat(ux): add action-first home dashboard`
- [ ] [T02.16] Ajustes generales y zona de peligro. — `feat(ui): add budget settings screen`
- [ ] [T02.17] Tests RLS + E2E (crear, reordenar, archivar, fusionar). — `test(budget): add rls and structure e2e tests`

## 02.12 No hacer

🟥 `ON DELETE CASCADE` desde categorías hacia transacciones · 🟥 borrar físicamente categorías/presupuestos con historial · 🟥 guardar `available` o `activity` en `category_months` · 🟥 renumerar posiciones con `+1/-1` ad hoc (usar el reindexado en bloque) · 🟥 hex de color libre en categorías · 🟥 tratar `inflow_rta` como caso especial en código en vez de fila real · 🟥 calcular Por asignar en el componente del Inicio.

---

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

## 03.11 Tasks atómicas

- [ ] [T03.1] Migración `accounts` + constraints/trigger de moneda + FK de `categories.linked_account_id` + RLS. — `feat(db): add accounts table with constraints and rls`
- [ ] [T03.2] Regla pura `startingBalanceRule` y `deriveIsOnBudget` + tests. — `feat(accounts): add starting balance rules`
- [ ] [T03.3] Comando `createAccount` (saldo inicial, categoría de pago de tarjeta) + integración. — `feat(accounts): add create account command`
- [ ] [T03.4] Función SQL `account_balances` (tras migración de transacciones) + test I3. — `feat(db): add account balances function`
- [ ] [T03.5] Query `listAccounts/getAccount` con totales. — `feat(accounts): add accounts overview queries`
- [ ] [T03.6] Comandos `updateAccount`, `reorderAccounts`. — `feat(accounts): add update and reorder commands`
- [ ] [T03.7] `closeAccount` (con transferencia), `reopenAccount`, `discardAccount`. — `feat(accounts): add close reopen and discard commands`
- [ ] [T03.8] `updateTrackingBalance`. — `feat(accounts): add tracking balance update`
- [ ] [T03.9] UI barra lateral de cuentas. — `feat(ui): add accounts sidebar`
- [ ] [T03.10] UI asistente "Agregar cuenta" con vista previa. — `feat(ui): add account creation wizard`
- [ ] [T03.11] UI encabezado de cuenta y asistente de cierre. — `feat(ui): add account header and close flow`
- [ ] [T03.12] Tests E2E de cuentas y RLS. — `test(accounts): add accounts e2e and rls tests`

## 03.12 No hacer

🟥 Columnas `current_balance/cleared_balance` mutables · 🟥 mezclar deuda de tarjetas dentro del "Disponible" · 🟥 cambiar `is_on_budget` a mano · 🟥 permitir cuentas en otra moneda antes de Spec 13 · 🟥 borrar cuentas con historial · 🟥 crear el saldo inicial sin transacción (debe ser un movimiento auditable) · 🟥 crear filas de `payees` para traspasos.

---

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

## 04.11 Tasks atómicas

- [ ] [T04.1] Extensión `pg_trgm` + migración `payees`. — `feat(db): add payees table with trigram index`
- [ ] [T04.2] Migración `transactions` + índices + triggers de moneda/estado. — `feat(db): add transactions table and indexes`
- [ ] [T04.3] Migración `transaction_splits` + trigger diferido I1. — `feat(db): add transaction splits with deferred sum check`
- [ ] [T04.4] Trigger diferido I2 (par de transferencia) + vista `v_txn_lines`. — `feat(db): add transfer pair check and transaction lines view`
- [ ] [T04.5] Funciones puras: `validateAmount`, `distribute`, `validateSplits`, `categoryRuleFor`, `nextStatus` + tests unit/property. — `feat(tx): add pure transaction domain functions`
- [ ] [T04.6] `normalizePayee` + búsqueda/sugerencia de categoría. — `feat(payees): add payee normalization and suggestions`
- [ ] [T04.7] Comando `createTransaction` (con payee y default_category). — `feat(tx): add create transaction command`
- [ ] [T04.8] Comandos `updateTransaction`, `setSplits`, bloqueo de conciliadas y `unlockReconciled`. — `feat(tx): add update split and reconciled lock commands`
- [ ] [T04.9] `transferMoney`, `updateTransfer`, `voidTransaction/restore` (par atómico). — `feat(tx): add transfer and void commands`
- [ ] [T04.10] Comandos masivos (`setCleared/Approved/Flag`, `bulkUpdate`, `duplicate`, `moveToAccount`). — `feat(tx): add bulk transaction commands`
- [ ] [T04.11] Query `getAccountRegister` (cursor, filtros) + `getTransaction`. — `feat(tx): add register and transaction queries`
- [ ] [T04.12] Comandos/UI de comercios (renombrar, fusionar, archivar). — `feat(payees): add payee management`
- [ ] [T04.13] UI registro virtualizado, filtros, selección múltiple y edición en línea. — `feat(ui): add transaction register`
- [ ] [T04.14] UI Sheet de captura rápida con `CalcInput` y efecto en vivo. — `feat(ui): add quick transaction sheet`
- [ ] [T04.15] UI dividir, transferir y detalle de transacción. — `feat(ui): add split transfer and detail views`
- [ ] [T04.16] Deshacer/rehacer (`UndoDescriptor`) para comandos de esta spec. — `feat(ux): add undo for transaction commands`
- [ ] [T04.17] Tests de integración (I1/I2/RLS/concurrencia) y E2E. — `test(tx): add ledger integration and e2e tests`

## 04.12 No hacer

🟥 Eliminar filas de `transactions` o `transaction_splits` (anular) · 🟥 guardar `date` como `timestamptz` · 🟥 crear el par de transferencia en dos llamadas separadas · 🟥 validar splits solo en la UI · 🟥 recalcular saldos/categorías dentro de los comandos de transacciones · 🟥 usar `OFFSET` en el registro · 🟥 permitir categoría en cuentas de seguimiento · 🟥 tratar un reembolso como ingreso por defecto · 🟥 aplicar cambios de IA sin `source='ai'` y aprobación.

---

---

# PARTE B — SPECS 05–12 (REGLAS DE DOMINIO DEL PLAN PROFUNDO)

> **Nivel de detalle:** cada spec recoge **todas** las reglas, fórmulas, ejemplos numéricos, estados y casos del plan profundo, organizadas en las mismas 12 secciones que las Specs 01–04.
> Donde falta el nivel de SQL completo o de Given/When/Then exhaustivo, la spec lo indica como *"por ampliar en `/speckit.clarify`"* — **no se inventan reglas para rellenar**.
> Las fórmulas canónicas viven en **A5** (una sola vez); estas specs las **usan**, no las redefinen.

---

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

## 05.11 Tasks atómicas

- [ ] [T05.1] Migración `budget_assignment_events` + RLS + índices. — `feat(db): add budget assignment events`
- [ ] [T05.2] Extender `category-state.ts` con enum de salud y `categoryHealth`. — `feat(engine): add category health states`
- [ ] [T05.3] `rollover.ts` (BR-ENG-010) + tests. — `feat(engine): add rollover rules`
- [ ] [T05.4] `overspending.ts` (efectivo vs tarjeta) + tests GS-05/GS-08. — `feat(engine): add overspending rules`
- [ ] [T05.5] `rta.ts` A5.4 + `invariants.ts` A5.5 + property test. — `feat(engine): add canonical rta and invariants`
- [ ] [T05.6] `snapshot.ts` + `getBudgetSnapshot`. — `feat(engine): add budget snapshot facade`
- [ ] [T05.7] Comandos `assignMoney/unassignMoney/moveMoney/resetAvailable` (atómicos, idempotentes). — `feat(budget): add assignment commands`
- [ ] [T05.8] `rankFundingRequirements` + `auto-assign.ts` (6 estrategias). — `feat(engine): add auto-assign strategies`
- [ ] [T05.9] `previewAutoAssign/applyAutoAssign` con `previewHash`. — `feat(budget): add auto-assign preview and apply`
- [ ] [T05.10] Warnings (`FUTURE_NEGATIVE_ASSIGNED`, `RTA_NEGATIVE`). — `feat(engine): add budget warnings`
- [ ] [T05.11] UI grilla de presupuesto + panel Auto-Assign + explicadores. — `feat(ui): add budget grid and auto-assign panel`
- [ ] [T05.12] Tests integración + E2E dorados. — `test(engine): add engine integration and golden e2e`

## 05.12 No hacer

🟥 `RTA = efectivo − asignado` · 🟥 sumar `previous_available + rollover` · 🟥 guardar `available`/`activity` como fuente de verdad · 🟥 mutar `assigned_minor` desde React o sin evento · 🟥 ejecutar Auto-Assign sin vista previa · 🟥 tratar una asignación futura como dinero recibido · 🟥 duplicar el cálculo de RTA en Inicio/Presupuesto/Tarjetas · 🟥 llamadas de red dentro de la transacción de asignación.

---

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

## 06.11 Tasks atómicas

- [ ] [T06.1] Migración `goals` + constraints + RLS. — `feat(db): add goals table`
- [ ] [T06.2] `calculateGoalRequirement` mensual (Set aside / Refill) + tests. — `feat(engine): add monthly goal calculation`
- [ ] [T06.3] Semanal (ocurrencias reales) + tests. — `feat(engine): add weekly goal calculation`
- [ ] [T06.4] Anual y personalizadas + tests. — `feat(engine): add yearly and custom goal calculation`
- [ ] [T06.5] Snooze y exclusión de Underfunded. — `feat(goals): add goal snooze`
- [ ] [T06.6] `GoalResultDTO` + `getGoalProgress`. — `feat(goals): add goal progress query`
- [ ] [T06.7] Comandos CRUD de metas. — `feat(goals): add goal commands`
- [ ] [T06.8] UI tarjeta, barra de 4 componentes y editor. — `feat(ui): add goal card and editor`
- [ ] [T06.9] E2E de metas + Underfunded. — `test(goals): add goals e2e`

## 06.12 No hacer

🟥 tratar el mes como 4 semanas · 🟥 borrar la meta al posponerla · 🟥 calcular progreso en JSX · 🟥 permitir `HAVE_A_BALANCE` repetible · 🟥 metas sobre categorías de sistema · 🟥 reinterpretar sobrantes como asignación nueva.

---

# SPEC 07 — CREDIT CARDS (TARJETAS) + PRÉSTAMOS

**Dependencias:** 03, 04, 05. **Hito:** M3. **Prefijos:** `FR-CC`, `BR-CC`, `AC-CC`.
La spec 07 original reconocía la categoría de pago pero no definía estados de déficit, sobrepago, transferencia, *float* ni sobregasto con tarjeta. Se divide en: creación de cuenta · vínculo de categoría de pago · compra financiada · compra sin fondos · pago · reembolso · sobrepago · transferencia de saldo · *float* · déficit · conciliación.

## 07.1 Cómo funciona YNAB (🟦)

- Al crear una tarjeta aparece automáticamente su **categoría de pago**. Una compra con tarjeta mueve dinero de la categoría de gasto **a** la categoría de pago; así el dinero para pagar queda reservado.
- **Sobregasto con tarjeta** = compra sin fondos: es deuda nueva. La categoría de pago se ve **roja** solo si envías **más de lo disponible** en ella (pago excesivo); la falta de fondos para cubrir la deuda es *Underfunded* (amarillo), no rojo.
- **Float:** usar ingreso actual para cubrir gasto anterior de la tarjeta.
- Un **saldo positivo** (sobrepago) tiene comportamiento especial; una **transferencia de saldo** entre tarjetas **no** mueve automáticamente fondos entre categorías de pago.
- **Préstamos** se distinguen de tarjetas; se puede vincular una categoría a un préstamo (calculadora de pago, *Record Payment*).

## 07.2 Qué hará Bolsilludo

| Capacidad | Tipo |
|---|---|
| Vínculo **explícito** `tarjeta → categoría de pago` (`categories.linked_account_id`), nunca por nombre | 🟦 paridad |
| Estados de tarjeta: financiada, sin fondos, déficit, sobrepago, saldo positivo, riesgo de *float* | 🟦 + 🟩 |
| Métrica `credit_card_float_risk` con aviso "Posible *float* de tarjeta" y acciones *Ver por qué / Corregir plan* | 🟩 mejora |
| Tarjeta de cuenta con cobertura de pago (`Cubierto 80%`) y botones *Pagar · Cubrir déficit · Conciliar* | 🟩 mejora |
| Inspector de tarjeta (compras, reembolsos, pagos, sobregastos, pago disponible, saldo) | 🟩 mejora |
| 🟨 `CC_TO_CC_UNSUPPORTED` en Fase 1 (ADR-G4): la **regla** de transferencia de saldo se especifica pero se habilita después detrás de un flag (ADR-M5) | Decisión |
| 🟨 Préstamos: `LOAN` es cuenta de **seguimiento (pasivo)** en Fase 1 (ADR-G17); `loan_details` y el simulador se entregan como extensión (07-L) y se amplían en el Debt Planner (Spec 21) | Decisión |

## 07.3 Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-CC-001 | Crear una cuenta `CREDIT_CARD` crea su categoría de pago en la misma transacción (FR-ACC-002). |
| FR-CC-002 | Una compra con tarjeta reduce el Disponible de su categoría y aumenta el pago disponible **solo por la parte financiada**. |
| FR-CC-003 | El sistema distingue sobregasto con tarjeta (amarillo) del de efectivo (rojo). |
| FR-CC-004 | Un pago (transferencia hacia la tarjeta desde cuenta on-budget no-tarjeta) reduce el pago disponible; no es un gasto de categoría. |
| FR-CC-005 | El sistema calcula déficit de pago, cobertura y riesgo de *float*, y los explica. |
| FR-CC-006 | El sistema representa el saldo positivo por sobrepago. |

## 07.4 Reglas de negocio

| ID | Regla |
|---|---|
| BR-CC-001 | La relación es `credit_card_account_id → payment_category_id` **explícita**. Nunca se identifica la categoría de pago por su nombre (`"Visa Payment"`). El pago **no** se registra como categoría de gasto (BR-TRX-012). |
| BR-CC-010 | **Compra financiada:** `Comida disponible 500` + compra `100` con tarjeta ⇒ `Comida 400`, `Pago disponible +100`, saldo de tarjeta `−100` más negativo. **Por asignar no cambia.** |
| BR-CC-011 | **Compra sin fondos:** `Comida disponible 50` + compra `100` ⇒ `financiado en efectivo 50`, `credit_overspent 50`, `Pago disponible +50`, `deuda adicional 50`. |
| BR-CC-020 | **Pago:** transferencia `Corriente −500 / Tarjeta +500` ⇒ saldo de tarjeta con menos deuda y `pago disponible −500`. |
| BR-CC-021 | **Déficit (Underfunded):** `saldo −850`, `pago disponible 600` ⇒ `UNDERFUNDED 250`. **No** es sobregasto en efectivo. |
| BR-CC-022 | **Sobrepago:** `pago disponible 400`, se paga `500` ⇒ `pago disponible −100`, estado `CASH_OVERSPENT` (rojo). |
| BR-CC-030 | **Reparto entre tarjetas** (referenciado por A5.3): el `funded(c,M)` de una categoría se reparte entre las tarjetas con `credit_net > 0` **proporcionalmente** a su `credit_net`, con la política de redondeo §140 (`floor` + resto a la **última** tarjeta en orden estable `position, id`). 🟨 |
| BR-CC-031 | **Reembolso en tarjeta:** vuelve a la categoría original y **sale** de la categoría de pago (ADR-G3, A5.2). |
| BR-CC-040 | **Float** (`credit_card_float_risk`): señal cuando `pago disponible < deuda de la tarjeta` **y** el usuario depende repetidamente del ingreso siguiente para pagar completo. Es una **advertencia**, nunca un bloqueo. |
| BR-CC-050 | **Saldo positivo** (sobrepago, `saldo > 0`): estado `POSITIVE_CREDIT_BALANCE`; **no** se considera deuda por pagar. |
| BR-CC-060 | **Transferencia de saldo** (`Visa −1000 / Mastercard +1000`): **no** se transfieren automáticamente los "Pago disponible" entre categorías de pago; el sistema explica y exige asignar/corregir. En Fase 1 devuelve `CC_TO_CC_UNSUPPORTED` (ADR-G4, ADR-M5). |
| BR-CC-070 | **Release gate:** las tarjetas no salen sin pruebas de: compra financiada, financiación parcial, sobregasto con tarjeta, pago, sobrepago y saldo positivo (Parte Y). |

### Estados de tarjeta (enum de dominio)

`FUNDED_PURCHASE · PARTIALLY_FUNDED · CREDIT_OVERSPENT · PAYMENT_UNDERFUNDED · PAYMENT_OVERSHOOT · POSITIVE_CREDIT_BALANCE · FLOAT_RISK`

### Préstamos (extensión 07-L, 🟨)

- Cuenta `LOAN` (seguimiento). Tablas: `loan_details` (`principal_minor, interest_rate, interest_type, minimum_payment_minor, due_day, original_balance_minor, term_months, start_date`) y `loan_payment_schedule`.
- **Amortización mensual:** `interés_periodo = principal × tasa_periódica` · `capital_pagado = pago − interés_periodo` · `nuevo_principal = principal − capital_pagado`. Si `pago < interés` ⇒ el principal **aumenta** y el simulador lo **alerta**.
- UI: `Restante 10.000 · Tasa 12% · Mínimo 500 · Fin proyectado 2028-10 · [Registrar pago] [Simular +100]`. El simulador **nunca** modifica el libro de préstamos.

## 07.5 Modelo de datos

Usa `accounts` (03.5) y `categories.linked_account_id` (02.5; `unique` por tarjeta ya definido). Estado derivado (no se persiste): `CreditCardState` del motor. Extensión 07-L: `loan_details`, `loan_payment_schedule` (RLS A8.3). `by-card` funded se calcula en el motor (BR-CC-030), no se almacena.

## 07.6 Backend

- `createAccount(CREDIT_CARD)` (03.6.1) crea el grupo "Pagos de tarjetas" y la categoría vinculada.
- Un **pago** es `transferMoney` a una tarjeta (04.6.1): el motor calcula sus efectos; no hay comando "pagar" que escriba dinero por otra vía.
- **Query:** `getCreditCardStatus(accountId, month)` → `CreditCardStatusDTO`:

```ts
type CreditCardStatusDTO = {
  accountId: string; workingBalance: Money; paymentAvailable: Money; coveragePct: number;
  status: 'FUNDED'|'PAYMENT_UNDERFUNDED'|'PAYMENT_OVERSHOOT'|'POSITIVE_CREDIT_BALANCE';
  underfundedAmount: Money; floatRisk: boolean;
  inspector: { purchases: Money; refunds: Money; payments: Money; creditOverspending: Money; cashOverspending: Money };
  explanation: { label: string; amount: Money }[];       // "¿Por qué mi pago está en falta?"
};
```
- Funciones puras: `credit-card.ts` (`fundedByCard`, `paymentAvailable`, `paymentStatus`, `floatRisk`).

## 07.7 UI

`Visa Gold · Saldo −1.250 · Pago disponible 1.000 · Cobertura 80% · Estado: Falta 250 · [Pagar tarjeta] [Cubrir déficit] [Conciliar]`. Aviso de *float*: *"Posible *float* de tarjeta — tu plan actual podría depender de ingresos futuros para una deuda existente. [Ver por qué] [Corregir plan]"*. Inspector con las 7 cifras del DTO. Diferenciar **rojo = efectivo** y **amarillo = tarjeta/falta** con icono + texto (A1).

## 07.8 Casos borde

Sobregasto mixto en la misma categoría · reembolso mayor que lo financiado · dos tarjetas con la misma categoría (BR-CC-030) · cerrar tarjeta con pago disponible > 0 (03.8) · saldo inicial de tarjeta con deuda previa (no mueve dinero, 03.1) · pago mayor que la deuda (`POSITIVE_CREDIT_BALANCE`) · compra con tarjeta en categoría archivada.

## 07.9 Criterios de aceptación

```text
AC-CC-01  Given Comida asignado 300 y compra con tarjeta de 100
          Then Comida.disponible 200 y Pago de tarjeta disponible 100, Por asignar sin cambio.

AC-CC-02  Given Comida disponible 50 y compra con tarjeta de 100
          Then credit_overspent 50, pago reservado 50, y NO es sobregasto en efectivo.

AC-CC-03  Given saldo −850 y pago disponible 600
          Then estado UNDERFUNDED 250 con explicación "Deuda 850 · Reservado 600 · Falta 250".

AC-CC-04  Given pago disponible 400 y pago realizado de 500
          Then pago disponible −100 y estado CASH_OVERSPENT.

AC-CC-05  Given un pago mayor que la deuda
          Then saldo > 0 y estado POSITIVE_CREDIT_BALANCE (no se muestra como deuda).

AC-CC-06  Given transferencia de saldo entre tarjetas (flag ON)
          Then los pagos disponibles NO se mueven solos y se explica cómo corregir.

AC-CC-07  Given un reembolso de tarjeta en Compras
          Then Compras.disponible sube y el pago disponible baja por la parte financiada.
```

## 07.10 Tests requeridos

Unit por cada BR-CC · property: `Σ funded_por_tarjeta = funded(c)` · integración: `createAccount` crea el vínculo; el pago no crea gasto de categoría · E2E: GS-04, GS-05, GS-15, GS-16 (Parte N) · **release gate** BR-CC-070.

## 07.11 Tasks atómicas

- [ ] [T07.1] Crear la categoría de pago al crear una cuenta de tarjeta (vínculo explícito). — `feat(cards): link payment category on card creation`
- [ ] [T07.2] Calcular el movimiento de una compra financiada. — `feat(engine): add funded card purchase movement`
- [ ] [T07.3] Calcular sobregasto con tarjeta (compra parcial). — `feat(engine): add credit overspending`
- [ ] [T07.4] Persistir el pago de tarjeta (transferencia a tarjeta). — `feat(cards): add card payment via transfer`
- [ ] [T07.5] DTO de cobertura de pago (`CreditCardStatusDTO`). — `feat(cards): add payment coverage dto`
- [ ] [T07.6] Test compra financiada. — `test(cards): add funded purchase test`
- [ ] [T07.7] Test sobregasto con tarjeta. — `test(cards): add credit overspending test`
- [ ] [T07.8] Test de pago (déficit y sobrepago). — `test(cards): add payment tests`
- [ ] [T07.9] Reparto entre tarjetas (BR-CC-030) + property test. — `feat(engine): add card funded split`
- [ ] [T07.10] Saldo positivo y métrica de *float*. — `feat(cards): add positive balance and float risk`
- [ ] [T07.11] UI tarjeta de cuenta, inspector y explicadores. — `feat(ui): add credit card status and inspector`
- [ ] [T07.12] Extensión 07-L: `loan_details` + simulador (sin tocar el libro). — `feat(loans): add loan details and payoff simulator`

*(Formato de cada task: ver Parte Y — Objetivo, Dependencias, Backend, Tests, Aceptación. Ejemplo T07.2: aceptación = "Por asignar sin cambio y la categoría de pago sube exactamente por el monto financiado".)*

## 07.12 No hacer

🟥 identificar la categoría de pago por nombre · 🟥 registrar el pago como gasto de categoría · 🟥 mezclar sobregasto de efectivo y de tarjeta · 🟥 mover automáticamente pagos disponibles entre tarjetas · 🟥 tratar un saldo positivo como deuda · 🟥 modificar el libro de préstamos desde el simulador · 🟥 liberar tarjetas sin las 6 pruebas de BR-CC-070.

---

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

## 08.11 Tasks atómicas

- [ ] [T08.1] Migración `reconciliations` + `reconcile_dirty` + RLS. — `feat(db): add reconciliations`
- [ ] [T08.2] `startReconciliation` y cálculo de saldo confirmado. — `feat(recon): add start reconciliation`
- [ ] [T08.3] `completeReconciliation` (+ ajuste como `reconciliation_adjustment`). — `feat(recon): add complete reconciliation`
- [ ] [T08.4] Protección de conciliadas y diálogo de 4 opciones. — `feat(recon): add reconciled protection flow`
- [ ] [T08.5] `suggestMatches` (score). — `feat(recon): add match suggestions`
- [ ] [T08.6] UI asistente de conciliación. — `feat(ui): add reconciliation assistant`
- [ ] [T08.7] Tests integración + E2E. — `test(recon): add reconciliation tests`

## 08.12 No hacer

🟥 confundir `cleared` con `reconciled` · 🟥 editar una compra antigua para cuadrar · 🟥 "desconciliar" en silencio · 🟥 conciliar sin comparar contra el saldo confirmado del banco · 🟥 permitir editar monto/fecha/cuenta de conciliadas sin el diálogo auditado.


---

# SPEC 09 — IMPORTS & BANK SYNC (CSV / OFX / QFX / PROVEEDORES / EMPAREJAMIENTO)

**Dependencias:** 03, 04. **Hito:** M3–M4. **Prefijos:** `FR-IMP`, `BR-IMP`, `AC-IMP`.
La spec 09 original ya proponía CSV/OFX/QFX + emparejamiento; se **amplía** con: ids de origen del proveedor, pendiente vs *posted*, payload crudo, presets de mapeo, checksum, ciclo de vida del lote, reintentos, idempotencia, confianza del emparejamiento y revisión manual.

## 09.1 Cómo funciona YNAB (🟦)

- La importación directa usa varios proveedores (p. ej. MX y Plaid); la disponibilidad depende de institución y región. También hay importación por archivo.
- Las transacciones importadas **pendientes no afectan** categorías ni saldos hasta convertirse en *cleared/posted*.
- Las importadas llegan **sin aprobar** (punto azul) hasta que el usuario las revisa (04.1).

## 09.2 Qué hará Bolsilludo

| Capacidad | Tipo |
|---|---|
| Importar CSV con **asistente de 8 pasos** y OFX/QFX con parsers separados | 🟦 paridad |
| Arquitectura por **proveedores** desacoplada del dominio (`BankProvider → NormalizedBankTransaction → Deduplicación → Emparejamiento → Motor de transacciones`) | 🟩 mejora |
| Payload crudo separado (`raw_bank_payloads`); el dominio no depende del JSON de Plaid/MX | 🟩 mejora |
| Deduplicación en 3 niveles + decisión persistida | 🟩 mejora |
| Emparejamiento con score y **revisión manual** (sin auto-fusión ambigua) | 🟩 mejora |
| `ImportAdapter` (`GenericCSV`, `OFX`, `QFX`, `YNABCSV`) para migrar desde YNAB sin tocar el libro | 🟩 mejora |
| 🟨 Fase 1 entrega **archivos + adaptador manual**; `PlaidAdapter`, `MXAdapter` y `OpenFinanceAdapter` son puntos de extensión (disponibilidad por región/banco) | Decisión |

## 09.3 Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-IMP-001 | `EDITOR+` importa un archivo CSV/OFX/QFX a una cuenta abierta. |
| FR-IMP-002 | El asistente permite mapear columnas, previsualizar, ver duplicados y categorías sugeridas y confirmar. |
| FR-IMP-003 | Importar el mismo archivo dos veces no duplica transacciones. |
| FR-IMP-004 | Las filas ambiguas van a **revisión manual**; nada se fusiona a ciegas. |
| FR-IMP-005 | Las transacciones importadas nacen `is_approved=false` y afectan saldos/categorías (BR-TRX-013). |
| FR-IMP-006 | Un lote se puede reintentar y auditar; su estado es visible. |

## 09.4 Reglas de negocio

| ID | Regla |
|---|---|
| BR-IMP-010 | **Huella (fingerprint)** por fila = `sha256(account_id | date | amount_minor | descripción normalizada | n)` donde `n` es la **ocurrencia** (nº de filas idénticas en el mismo archivo/fecha), para no colapsar compras legítimamente repetidas. 🟨 |
| BR-IMP-011 | El **checksum del archivo** y `UNIQUE(account_id, checksum)` evitan reaplicar el mismo lote ⇒ `IMPORT_BATCH_ALREADY_APPLIED`. |
| BR-IMP-020 | **Pendiente vs *posted*:** una transacción externa `PENDING_EXTERNAL` vive **solo en staging** (`import_rows`): **no** muta saldos, actividad ni disponible. Al pasar a *posted*: `emparejar con existente/manual O crear transacción`. (El estado del libro sigue siendo `PENDING/CLEARED/RECONCILED/VOIDED`, ADR-M4.) |
| BR-IMP-030 | **Score de emparejamiento:** `id externo exacto +0,40` · `monto exacto +0,30` · `cercanía de fecha +0,15` · `similitud de comercio +0,15`. |
| BR-IMP-031 | **Umbrales:** `≥ 0,90` sugerencia fuerte · `0,60–0,89` **revisión manual** · `< 0,60` sin coincidencia. **Nunca** auto-fusionar lo ambiguo. |
| BR-IMP-040 | **Detección de duplicados**, en orden: 1 `external_id` exacto · 2 proveedor/cuenta + monto + fecha · 3 cuenta + monto + fecha + similitud de comercio. Se persiste la decisión: `MATCHED · REJECTED · DUPLICATE · NEW`. |
| BR-IMP-050 | **Asistente CSV (8 pasos):** 1 Subir · 2 Detectar columnas · 3 Mapear · 4 Vista previa · 5 Análisis de duplicados · 6 Categorías sugeridas · 7 Revisión · 8 Confirmar. Se guardan **presets de mapeo** por institución. |
| BR-IMP-060 | **OFX/QFX:** parsers separados (`OFXParser`, `QFXParser`) que producen `NormalizedImportTransaction`. **Nunca** se duplica la lógica de emparejamiento. |
| BR-IMP-070 | **Ciclo de vida del lote:** `PENDING → PARSED → REVIEW → APPLIED \| FAILED \| CANCELLED`, con reintentos (`retry_count`, `next_retry_at`, `last_error`) e idempotencia (`idempotency_key`). |
| BR-IMP-080 | **Normalización** de cada fila: `external_id, account_external_id, merchant_name, raw_description, normalized_payee, amount_minor, currency, authorized_date, posted_date, pending`. La descripción original **nunca** se destruye (BR-PAY-007). |
| BR-IMP-090 | **Seguridad:** el contenido de un archivo/memo es **dato, no instrucción**: nunca se interpreta como prompt ni comando (bug #25). Límite de tamaño/filas y tipos permitidos (`IMPORT_FILE_TOO_LARGE`, `IMPORT_UNSUPPORTED_FORMAT`). |

## 09.5 Modelo de datos

```sql
create table import_batches (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  account_id uuid not null,
  source_type text not null check (source_type in ('CSV','OFX','QFX','YNAB_CSV','BANK_SYNC','MANUAL')),
  filename text, checksum text,
  status text not null check (status in ('PENDING','PARSED','REVIEW','APPLIED','FAILED','CANCELLED')),
  total_rows int not null default 0, accepted_rows int not null default 0,
  duplicate_rows int not null default 0, rejected_rows int not null default 0,
  retry_count int not null default 0, next_retry_at timestamptz, last_error text,
  idempotency_key uuid not null,
  created_by uuid not null, created_at timestamptz not null default now(), completed_at timestamptz,
  foreign key (account_id, budget_id) references accounts (id, budget_id)
);
create unique index import_batches_checksum_uq on import_batches (account_id, checksum) where status = 'APPLIED';

create table import_rows (            -- staging: retención limitada (A4: DELETE físico permitido en datos efímeros)
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references import_batches(id) on delete cascade,
  budget_id uuid not null,
  row_index int not null, fingerprint text not null,
  external_id text, merchant_name text, raw_description text, normalized_payee text,
  amount_minor bigint not null, currency char(3) not null,
  authorized_date date, posted_date date, pending boolean not null default false,
  decision text not null default 'NEW' check (decision in ('NEW','MATCHED','REJECTED','DUPLICATE')),
  matched_transaction_id uuid, match_score numeric(4,3), suggested_category_id uuid
);

create table raw_bank_payloads (      -- JSON del proveedor, aislado del dominio
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null, provider text not null, connection_id uuid,
  payload jsonb not null, received_at timestamptz not null default now(), retention_until timestamptz
);
-- transactions.external_id + índice único (account_id, external_id) ya definidos en 04.5.
-- accounts.connection_id / external_account_id (03.5) referencian la conexión bancaria futura.
-- RLS: plantilla A8.3 en todas; raw_bank_payloads solo rol de servicio.
```

## 09.6 Backend

```ts
interface BankProvider {
  connect(input: ConnectInput): Promise<ConnectionResult>;
  listAccounts(connectionId: string): Promise<ExternalAccount[]>;
  syncTransactions(connectionId: string): Promise<ExternalTransaction[]>;
  getStatus(connectionId: string): Promise<ConnectionStatus>;
  disconnect(connectionId: string): Promise<void>;
}
// Adaptadores: ManualAdapter (Fase 1) · PlaidAdapter · MXAdapter · OpenFinanceAdapter (extensión)
```

**Pipeline obligatorio:** `BankProvider → NormalizedBankTransaction → Deduplicación → Emparejamiento → Motor de transacciones`. **Nunca** `Plaid → React → BD`.

| Comando | Efecto | Errores |
|---|---|---|
| `createImportBatch` | sube archivo, valida tipo/tamaño/checksum | `IMPORT_FILE_TOO_LARGE`, `IMPORT_UNSUPPORTED_FORMAT`, `IMPORT_BATCH_ALREADY_APPLIED` |
| `mapImportColumns` / `previewImport` | mapea y devuelve filas normalizadas + decisiones | `IMPORT_MAPPING_INVALID`, `IMPORT_ROW_INVALID` |
| `resolveImportRow` | el usuario decide `MATCHED/REJECTED/DUPLICATE/NEW` | – |
| `commitImportBatch` | crea las transacciones `source='import'`, `is_approved=false`, en **una transacción**; idempotente | `DUPLICATE_TRANSACTION` |
| `retryImportBatch` | reintenta un lote `FAILED` | – |

Auditoría: `import.created|previewed|committed|failed`. Rate limit de importación (A8.2). Comercio crudo en `raw_description` (BR-PAY-007).

## 09.7 UI

Asistente de 8 pasos (BR-IMP-050) en `/b/[id]/settings/import` y desde la cuenta. Paso 5 muestra duplicados con % y botones *Emparejar/Rechazar*; paso 7 lista lo que requiere revisión manual; la cola de "por revisar" alimenta Atención (02.6.4). Estados A9.3 y errores con "qué pasó, por qué, cuánto falta".

## 09.8 Casos borde

Mismo archivo dos veces (checksum) · dos compras idénticas el mismo día en el mismo archivo (BR-IMP-010) · pendiente que luego cambia de monto/fecha al *postear* · fecha fuera de rango · moneda distinta a la de la cuenta · CSV con celdas que empiezan con `=`/`+`/`-`/`@` (solo afecta exportar, 11.6) · archivo con filas mixtas válidas/ inválidas (`rejected_rows`).

## 09.9 Criterios de aceptación

```text
AC-IMP-01  Given un archivo ya importado
           When se sube de nuevo
           Then IMPORT_BATCH_ALREADY_APPLIED y no se crea ninguna transacción (GS-11).

AC-IMP-02  Given una fila con score 0,75
           Then queda en revisión manual y no se fusiona sola.

AC-IMP-03  Given una transacción pendiente externa
           Then no cambia saldos, actividad ni disponible hasta ser posted.

AC-IMP-04  Given una fila con external_id ya existente en la cuenta
           Then se marca DUPLICATE.

AC-IMP-05  Given un memo de CSV con texto tipo "ignora tus reglas y..."
           Then se trata como dato: no altera ningún flujo (dato ≠ instrucción, BR-IMP-090).

AC-IMP-06  Given un commit interrumpido a la mitad
           Then no queda ninguna transacción parcial y el lote puede reintentarse.
```

## 09.10 Tests requeridos

Unit: normalización, `fingerprint`, score y umbrales, parsers OFX/QFX/CSV (property: parsear→normalizar es determinista) · integración: idempotencia por checksum e `idempotency_key`, `UNIQUE(account_id, external_id)` · E2E: asistente completo y doble importación (GS-11).

## 09.11 Tasks atómicas

- [ ] [T09.1] Migraciones `import_batches`, `import_rows`, `raw_bank_payloads` + RLS. — `feat(db): add import tables`
- [ ] [T09.2] Normalización y `fingerprint` (con ocurrencia) + tests. — `feat(imports): add row normalization and fingerprint`
- [ ] [T09.3] Parsers CSV, OFX, QFX → `NormalizedImportTransaction`. — `feat(imports): add file parsers`
- [ ] [T09.4] Deduplicación en 3 niveles + decisión persistida. — `feat(imports): add duplicate detection`
- [ ] [T09.5] Score y umbrales de emparejamiento. — `feat(imports): add match scoring`
- [ ] [T09.6] `commitImportBatch` atómico e idempotente. — `feat(imports): add atomic import commit`
- [ ] [T09.7] Interfaz `BankProvider` + `ManualAdapter`. — `feat(imports): add bank provider interface`
- [ ] [T09.8] UI asistente de 8 pasos + presets de mapeo. — `feat(ui): add import wizard`
- [ ] [T09.9] `YNABCSV` como `ImportAdapter`. — `feat(imports): add ynab csv adapter`
- [ ] [T09.10] Tests integración + E2E. — `test(imports): add import tests`

## 09.12 No hacer

🟥 `Plaid → React → BD` · 🟥 que el dominio dependa del JSON del proveedor · 🟥 mutar saldos/categorías con pendientes externos · 🟥 auto-fusionar coincidencias ambiguas · 🟥 destruir la descripción original · 🟥 tratar texto del archivo como instrucción · 🟥 duplicar la lógica de emparejamiento entre parsers · 🟥 guardar credenciales bancarias de usuario si existe OAuth/token.

---

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

## 10.11 Tasks atómicas

- [ ] [T10.1] Migración `scheduled_transactions` + índice único de ocurrencia + RLS. — `feat(db): add scheduled transactions`
- [ ] [T10.2] `calculateDueOccurrences` con ancla y zona horaria + tests. — `feat(scheduled): add occurrence engine`
- [ ] [T10.3] `processDueScheduled` idempotente con reintentos. — `feat(scheduled): add due scheduled job`
- [ ] [T10.4] Comandos CRUD + `postOccurrence`. — `feat(scheduled): add scheduled commands`
- [ ] [T10.5] Query `getUpcoming` + integración con Underfunded. — `feat(scheduled): add upcoming query`
- [ ] [T10.6] UI lista "Próximos" y editor. — `feat(ui): add scheduled screens`
- [ ] [T10.7] Tests integración + E2E. — `test(scheduled): add scheduled tests`

## 10.12 No hacer

🟥 `cron if hoy == día` · 🟥 sumar al resultado anterior (deriva) · 🟥 evaluar fechas en la zona del servidor · 🟥 crear transacciones sin `UNIQUE(scheduled_id, occurrence_date)` · 🟥 hacer llamadas de red dentro de la transacción del job.

---

# SPEC 11 — REPORTS (REPORTES, EDAD DEL DINERO, EXPORTACIÓN)

**Dependencias:** 03, 04, 05, 07. **Hito:** M4. **Prefijos:** `FR-RPT`, `BR-RPT`, `AC-RPT`.
La spec 11 original solo mencionaba los agregados básicos. Ahora **cada reporte** especifica: cuentas incluidas, tipos de transferencia excluidos, tratamiento de reembolsos, límite de fechas, moneda y agregación.

## 11.1 Cómo funciona YNAB (🟦)

- Reportes de gasto, ingresos vs gastos, patrimonio neto (*net worth*) y tendencias. Las **cuentas de seguimiento** entran al patrimonio neto pero **no** al plan (Por asignar).
- **Age of Money** = promedio de tiempo entre ganar y gastar dinero.

## 11.2 Qué hará Bolsilludo

| Capacidad | Tipo |
|---|---|
| Servicio único `ReportService` (no se hacen sumatorias complejas en React) | 🟩 mejora |
| Reportes: ingresos vs gastos · gasto por categoría/comercio · patrimonio neto · flujo de caja · saldos de cuentas · progreso de metas · tendencias · edad del dinero | 🟦 + 🟩 |
| Definición explícita por reporte (tabla 11.4) | 🟩 mejora |
| **Edad del dinero** como **analítica separada** del motor (no altera Por asignar) | 🟦 + 🟨 |
| Exportar CSV (Fase 1); JSON completo y PDF (Fase 2) con prevención de inyección de fórmulas | 🟩 mejora |
| 🟨 Tasa de ahorro y *runway* de efectivo son métricas **propias** (Fase 2) presentadas como estimaciones | Decisión |

## 11.3 Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-RPT-001 | Cualquier miembro (VIEWER+) consulta reportes con filtros de cuenta, fecha, estado (*cleared/uncleared*), comercio y categoría. |
| FR-RPT-002 | Los reportes de ingresos/gastos y gasto **excluyen transferencias**. |
| FR-RPT-003 | El patrimonio neto incluye cuentas de seguimiento sin afectar Por asignar. |
| FR-RPT-004 | `EDITOR+` exporta CSV de transacciones, categorías y cuentas. |
| FR-RPT-005 | El sistema calcula la edad del dinero y la muestra en `reports/age-of-money`. |

## 11.4 Reglas de negocio

| ID | Regla |
|---|---|
| BR-RPT-010 | **Transferencias excluidas** de Ingresos/Gastos y Gasto: `Corriente −500 / Ahorros +500` **no** aparece como *Gasto 500* ni *Ingreso 500*. Un **reembolso** no es ingreso (BR-TRX-070) salvo que vaya a `inflow_rta`. Un pago de tarjeta es transferencia (excluido). |
| BR-RPT-020 | **Patrimonio neto = Activos totales − Pasivos totales.** Efectivo/banco participan; cuentas de seguimiento se incluyen; tarjetas y préstamos son pasivos. |
| BR-RPT-030 | **Flujo de caja** separa: entradas operativas · salidas operativas · transferencias · movimientos de deuda ⇒ `Entradas · Salidas · Flujo neto`. |
| BR-RPT-040 | **Edad del dinero:** analítica separada. Primera versión reproducible: crear *lotes* de ingreso en efectivo; consumo **FIFO** por gasto en efectivo; `edad = fecha_gasto − fecha_lote`; promedio sobre eventos de gasto elegibles. **No** se usa para cambiar Por asignar. |
| BR-RPT-050 | **Tasa de ahorro** (Fase 2) `= (ahorro neto / ingresos) × 100`; la definición de "ahorro" es **configurable**; una transferencia a otra cuenta no es ahorro automático salvo que siga siendo patrimonio líquido. |
| BR-RPT-060 | **Runway** `= efectivo líquido / gasto esencial mensual promedio`, mostrado como estimación (*"≈ 3,2 meses"*), **nunca** como garantía. |

**Definición por reporte (🟨 salvo lo ya fijado por reglas anteriores):**

| Reporte | Cuentas incluidas | Excluye | Reembolsos | Frontera de fechas | Moneda | Agregación |
|---|---|---|---|---|---|---|
| Ingresos vs gastos | on-budget | transferencias, saldo inicial, ajustes de conciliación | netean el gasto de su categoría; ingreso solo si van a `inflow_rta` | `date` (DATE, tz del presupuesto), extremos inclusivos | moneda del presupuesto | Σ líneas (splits) |
| Gasto por categoría / comercio | on-budget | `inflow_rta`, pago de tarjeta, transferencias | netean | ídem | ídem | Σ actividad neta por `category_id` / `payee_id` |
| Patrimonio neto | on-budget + seguimiento | – | – | `as_of` (saldo a la fecha) | ídem | Σ activos − Σ pasivos |
| Flujo de caja | on-budget | – (separa transferencias y deuda) | netean en salidas | ídem | ídem | por grupo de BR-RPT-030 |
| Saldos de cuentas | todas | anuladas | – | `as_of` | ídem | `account_balances` (03.5.2) |
| Progreso de metas | on-budget | – | – | mes | ídem | `getGoalProgress` (Spec 06) |
| Edad del dinero | on-budget efectivo | transferencias | – | rango | ídem | BR-RPT-040 |

## 11.5 Modelo de datos

Los reportes **derivan** de `v_txn_lines` (04.5) y `account_balances` (03.5.2). Si hace falta rendimiento: vistas materializadas / tabla de refresco por job (A13.2), siempre invalidables y **no** fuente de verdad (A13.3). Edad del dinero: `income_lots` (`account_id, lot_date, amount_minor, remaining_minor`) como **cálculo analítico**, aislado del motor. RLS: `select` VIEWER (A8.3).

## 11.6 Backend

```ts
ReportService = {
  getIncomeVsExpense(); getSpendingByCategory(); getSpendingByPayee(); getNetWorth();
  getCashFlow(); getAccountBalances(); getGoalProgress(); getAgeOfMoney();
}
```
- Rutas: `GET /api/v1/budgets/:id/reports/spending` · `GET /api/v1/budgets/:id/reports/net-worth` (+ resto).
- **Exportación:** CSV de transacciones, categorías y cuentas (Fase 1). Celdas que empiezan con `=`, `+`, `-` o `@` se prefijan con `'` (**prevención de inyección de fórmulas**, bug #26). Fase 2: JSON completo y PDF.
- **JSON de exportación (versión 1):** `{ version:1, budget, members[], accounts[], categories[], transactions[], goals[], scheduledTransactions[], reconciliations[] }`.

## 11.7 UI

Primera capa **"Este mes"**: `Ingresos 5.000 · Gastos 3.700 · Neto 1.300`. Segunda capa: `Tendencia · Categorías · Comercios · Cuentas`. Filtros: cuenta, desde, hasta, confirmada/pendiente, comercio, categoría. Rutas en A9.2. Estados A9.3.

## 11.8 Casos borde

Transferencia con un lado conciliado · reembolso de un mes anterior · split con signos mixtos · cuenta cerrada con historial (sigue en reportes, 03.4) · categoría archivada (sufijo *"(archivada)"*, BR-CAT-020) · rango vacío · mes en curso parcial.

## 11.9 Criterios de aceptación

```text
AC-RPT-01  Given transferencia Corriente −500 / Ahorros +500
           Then Ingresos vs gastos no muestra Gasto 500 ni Ingreso 500.

AC-RPT-02  Given reembolso de Bs 100 en Compras
           Then el reporte de ingresos NO cambia y Compras neta −100 de gasto.

AC-RPT-03  Given una cuenta de seguimiento con Bs 12.000
           Then el patrimonio neto sube Bs 12.000 y Por asignar no cambia.

AC-RPT-04  Given un memo que empieza con "=" al exportar CSV
           Then la celda sale prefijada con ' .

AC-RPT-05  Given la edad del dinero calculada
           Then Por asignar es idéntico con y sin ese cálculo.
```

## 11.10 Tests requeridos

Unit por reporte con datasets dorados · property: `Σ gasto por categoría = Σ líneas de gasto` · integración: transferencias excluidas · E2E: "Este mes" y exportación.

## 11.11 Tasks atómicas

- [ ] [T11.1] `ReportService` base + `getIncomeVsExpense` (excluye transferencias). — `feat(reports): add income vs expense`
- [ ] [T11.2] Gasto por categoría/comercio. — `feat(reports): add spending reports`
- [ ] [T11.3] Patrimonio neto y saldos. — `feat(reports): add net worth`
- [ ] [T11.4] Flujo de caja. — `feat(reports): add cash flow`
- [ ] [T11.5] Edad del dinero (FIFO, analítica aislada). — `feat(reports): add age of money`
- [ ] [T11.6] Exportación CSV con prefijo anti-fórmula. — `feat(reports): add csv export`
- [ ] [T11.7] UI "Este mes" y capas de detalle. — `feat(ui): add reports screens`
- [ ] [T11.8] Tests integración + E2E. — `test(reports): add reports tests`

## 11.12 No hacer

🟥 sumatorias complejas en React · 🟥 contar transferencias como ingreso/gasto · 🟥 tratar un reembolso como ingreso por defecto · 🟥 usar la edad del dinero para calcular Por asignar · 🟥 presentar *runway* como garantía · 🟥 exportar CSV sin neutralizar fórmulas.

---

# SPEC 12 — COLLABORATION (COLABORACIÓN, ROLES, INVITACIONES, AUDITORÍA)

**Dependencias:** 01, 02. **Hito:** M4. **Prefijos:** `FR-COL`, `BR-COL`, `AC-COL`.
La lógica de roles original es correcta como base. Se añade: expiración y revocación de invitaciones, eliminación de miembros, verificación de rol en el dominio, pruebas de políticas RLS y feed de actividad.

## 12.1 Cómo funciona YNAB (🟦)

- Un plan puede **compartirse** con otras personas; cada una tiene su cuenta y ve/edita según su permiso.
- El dueño del plan gestiona quién tiene acceso.

## 12.2 Qué hará Bolsilludo

| Capacidad | Tipo |
|---|---|
| Roles `OWNER / ADMIN / EDITOR / VIEWER` (ADR-M1) | 🟦 + 🟨 |
| Invitaciones por correo con token de un solo uso (solo se guarda el **hash**) | 🟩 mejora |
| Expiración, revocación, cambio de rol y remoción de miembros | 🟩 mejora |
| Feed de actividad (`audit_events`) con vistas por rol | 🟩 mejora |
| RLS + autorización de servidor + de dominio (A13.7) con pruebas por política | 🟩 mejora |

## 12.3 Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-COL-001 | `ADMIN+` invita por correo con un rol (no `OWNER`). |
| FR-COL-002 | El invitado acepta con el enlace y queda como miembro. |
| FR-COL-003 | `ADMIN+` cambia roles y quita miembros (con límites, BR-COL-030). |
| FR-COL-004 | `OWNER` transfiere la propiedad y es el único que archiva/elimina el presupuesto. |
| FR-COL-005 | Cualquier miembro puede salir (salvo el último `OWNER`). |
| FR-COL-006 | Los miembros ven el feed de actividad según su rol (A7). |

## 12.4 Reglas de negocio

**Matriz de permisos** (base de A8.3; unifica la matriz de 3 roles del plan profundo con `ADMIN`, 🟨 ADR-M1):

| Acción | OWNER | ADMIN | EDITOR | VIEWER |
|---|:-:|:-:|:-:|:-:|
| Ver presupuesto y reportes | ✓ | ✓ | ✓ | ✓ |
| Crear/editar/anular transacciones | ✓ | ✓ | ✓ | – |
| Asignar / mover dinero / Auto-Assign | ✓ | ✓ | ✓ | – |
| Crear/editar metas y estructura de categorías | ✓ | ✓ | ✓ | – |
| Conciliar / importar / programadas | ✓ | ✓ | ✓ | – |
| Ajustes del presupuesto (nombre, zona horaria, `strict_budgeting`) | ✓ | ✓ | – | – |
| Invitar / cambiar roles / quitar miembros | ✓ | ✓ *(sin tocar OWNER)* | – | – |
| Ver auditoría completa | ✓ | ✓ | feed | – |
| Transferir propiedad · archivar · eliminar presupuesto | ✓ | – | – | – |

| ID | Regla |
|---|---|
| BR-COL-001 | Todo presupuesto tiene ≥ 1 `OWNER` (BR-BUD-007). El último `OWNER` no puede salir ⇒ `LAST_OWNER_CANNOT_LEAVE`. |
| BR-COL-010 | **Invitación:** `crear → generar token aleatorio → guardar solo el hash → enviar correo → el usuario acepta → crear membresía → invalidar token`. **Nunca** se guarda el token en claro. |
| BR-COL-011 | La invitación es para **un correo** (`INVITE_EMAIL_MISMATCH`), **vence** (🟨 7 días ⇒ `INVITE_EXPIRED`), se puede **revocar** (`INVITE_REVOKED`) y no se acepta si ya es miembro (`INVITE_ALREADY_MEMBER`). |
| BR-COL-020 | `requireMember(ctx, budgetId, minRole)` se aplica **en el dominio**, además de RLS: no se confía solo en el frontend. |
| BR-COL-030 | `ADMIN` no puede asignar/quitar `OWNER` ni degradarse a sí mismo el último rol de administración (`MEMBER_ROLE_FORBIDDEN`). |
| BR-COL-040 | Remover un miembro no borra sus datos: sus eventos de auditoría conservan `actor_user_id` (seudonimizado si borra su cuenta, BR-IDN-014). |

## 12.5 Modelo de datos

`budget_members` ya definida en 02.5 (roles y `joined_at`). Se añade:

```sql
create table budget_invitations (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  email text not null,
  role text not null check (role in ('ADMIN','EDITOR','VIEWER')),
  token_hash text not null unique,                 -- solo hash; nunca el token
  invited_by uuid not null, invited_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz, revoked_at timestamptz
);
create index on budget_invitations (budget_id, email);
-- Escritura solo por comandos SECURITY DEFINER; RLS: select ADMIN+ del presupuesto.
-- Constraint diferida: cada presupuesto conserva ≥ 1 OWNER.
```

## 12.6 Backend

| Comando | Reglas | Errores | Auditoría |
|---|---|---|---|
| `inviteMember` | BR-COL-010/011; rate limit (A8.2) | `PERMISSION_DENIED`, `INVITE_ALREADY_MEMBER` | `member.invited` |
| `acceptInvitation` (idempotente) | valida hash, vigencia, correo | `INVITE_EXPIRED`, `INVITE_REVOKED`, `INVITE_EMAIL_MISMATCH` | `member.joined` |
| `revokeInvitation` | `ADMIN+` | – | `member.invite_revoked` |
| `changeMemberRole` / `removeMember` | BR-COL-030 | `MEMBER_ROLE_FORBIDDEN` | `member.role_changed` / `member.removed` |
| `transferOwnership` / `leaveBudget` | BR-COL-001 | `LAST_OWNER_CANNOT_LEAVE` | `member.ownership_transferred` / `member.left` |

Queries: `listMembers`, `getActivityFeed(budgetId, cursor)` (rol-dependiente). Registrar en auditoría: mutaciones de transacciones, asignaciones, transferencias, metas, conciliaciones, importaciones y cambios de miembros.

## 12.7 UI

`/b/[id]/settings/members` (lista con rol, invitar, cambiar rol, quitar) y `/b/[id]/settings/activity` (feed con filtros). VIEWER: controles de edición ocultos/deshabilitados con *tooltip* (A9.3). `/invite/[token]` (Spec 01 lo permite sin sesión).

## 12.8 Casos borde

Invitar a un correo ya miembro · aceptar con otro correo · invitación vencida/revocada · último `OWNER` intenta salir o degradarse · quitar a un miembro con sesión abierta (pierde acceso en < 2 s vía Realtime/RLS) · `ADMIN` intenta ascender a `OWNER`.

## 12.9 Criterios de aceptación

```text
AC-COL-01  Given un VIEWER
           When intenta crear una transacción (UI o API)
           Then la UI oculta la acción y la API responde PERMISSION_DENIED.

AC-COL-02  Given una invitación
           Then en BD solo existe token_hash y nunca el token en claro.

AC-COL-03  Given una invitación vencida
           Then INVITE_EXPIRED y se puede pedir otra.

AC-COL-04  Given el único OWNER
           When intenta salir
           Then LAST_OWNER_CANNOT_LEAVE con acción "Transferir propiedad".

AC-COL-05  Given un usuario A y un presupuesto de B
           When A consulta cualquier tabla del presupuesto
           Then 0 filas (RLS) y NOT_FOUND en la API.
```

## 12.10 Tests requeridos

**Pruebas de política RLS por tabla y por rol** (Vitest + cliente Supabase con JWT distinto) · unit de la matriz de permisos · integración: hash de token, vencimiento, revocación, último `OWNER` · E2E: invitar → aceptar → editar como EDITOR → ver bloqueado como VIEWER.

## 12.11 Tasks atómicas

- [ ] [T12.1] Migración `budget_invitations` + RLS + constraint de ≥ 1 OWNER. — `feat(db): add budget invitations`
- [ ] [T12.2] Matriz de permisos pura + `requireMember` en dominio. — `feat(collab): add permission matrix`
- [ ] [T12.3] `inviteMember` / `acceptInvitation` (hash, vigencia). — `feat(collab): add invitation flow`
- [ ] [T12.4] `changeMemberRole` / `removeMember` / `transferOwnership` / `leaveBudget`. — `feat(collab): add member management`
- [ ] [T12.5] `getActivityFeed` por rol. — `feat(collab): add activity feed`
- [ ] [T12.6] UI miembros y actividad. — `feat(ui): add members and activity screens`
- [ ] [T12.7] Tests RLS por política + E2E. — `test(collab): add rls policy and collaboration e2e`

## 12.12 No hacer

🟥 guardar el token de invitación en claro · 🟥 confiar la autorización solo al frontend · 🟥 permitir que un `ADMIN` gestione `OWNER` · 🟥 dejar un presupuesto sin `OWNER` · 🟥 borrar datos al quitar a un miembro · 🟥 mostrar la auditoría completa a `EDITOR/VIEWER`.


---

# PARTE C — FASE 2 Y CAPA DE IA (DIFERENCIACIÓN)

> **Regla de entrada:** nada de esta parte empieza hasta pasar el **primer checkpoint** ("ya funciona como YNAB", Parte Y) y las pruebas de RTA, arrastre, tarjeta, conciliación, transferencia, split, meta e importación. *La IA sobre un ledger incorrecto solo automatiza errores.*
> Cada tema aparece **una sola vez** aquí (el plan profundo lo repetía en dos secciones).

## C1. Metas avanzadas (después del core)
Añadir: `goal_priority`, `goal_dependency_id`, `milestones`, `scenario`, `expected_completion_date`, *health score*.
- **Dependencias** (ej. `Fondo de emergencia → Pago extra de deuda → Inversiones`): el motor puede **recomendar** prioridades pero **no cambia asignaciones sin aprobación**.
- **What-if:** `Actual: 14 meses · +100/mes: 9 meses`. Es **simulación pura**: no toca la BD hasta pulsar *Aplicar*.

## C2. Multi-moneda (Spec 13)
- Tablas: `currencies`, `exchange_rates`, `fx_snapshots`. Moneda del presupuesto = `base_currency`. No se suman monedas distintas sin FX explícito.
- FX histórico: `from_currency, to_currency, rate, source, valid_at`. **Nunca** recalcular una transacción histórica con la tasa actual.
- Transferencia entre monedas: `monto origen + moneda origen + tasa + monto destino + moneda destino`.
- Levanta las restricciones de Fase 1: `TRANSFER_CURRENCY_MISMATCH`, `ACCOUNT_CURRENCY_MISMATCH`, BR-ACC-002.

## C3. Gastos compartidos
- Tablas: `shared_expense_groups`, `shared_expenses`, `shared_participants`, `settlements`. Ej.: `Cena 120 → Gabriel 40 · Luis 40 · Ana 40`.
- Un *settlement* crea una **obligación**; **no muta silenciosamente** categorías ni el libro de otros usuarios sin un settlement autorizado.

## C4. Activos y patrimonio
- Tablas: `assets`, `asset_valuations`, `liabilities`, `net_worth_snapshots`. Tipos de activo: `INVESTMENT, CRYPTO, PROPERTY, VEHICLE, OTHER`. Patrimonio neto = Σ activos − Σ pasivos (extiende BR-RPT-020).

## C5. Planificador de deuda (Spec 21)
- Mínimo, interés, pago extra, *snowball*, *avalanche*. Escenarios: `solo mínimo · +50 · +100 · snowball · avalanche`. **Nunca** modifica la deuda real ni el libro de préstamos desde el simulador.

## C6. IA — categorización, copiloto y acciones

**Orden de decisión (nunca "LLM primero"):**
`1 regla explícita del usuario → 2 historial exacto de comercio/payee → 3 clasificador histórico personal → 4 modelo de comercio → 5 LLM de respaldo`. La IA **no** sobrescribe una regla explícita.

**Confianza inicial** (umbrales propios, se calibran con métricas reales): `≥ 0,98` sugerencia de alta confianza · `0,75–0,979` sugerencia · `< 0,75` revisión manual.
**Explicación obligatoria:** *"Sugerido: Comida · Confianza 94% · Porque 17 de tus últimas 18 transacciones en este comercio fueron Comida."*

**La IA no escribe en la BD.** Flujo: `LLM → Sugerencia → Comando validado → Autorización → Servicio de dominio → BD` (`source='ai'`, BR-TRX-007). Estados de acción: `DRAFT → PROPOSED → APPROVED → APPLIED` (o `REJECTED / EXPIRED`); **no** se salta `PROPOSED → APPLIED` sin autorización cuando la acción es financiera.

**Copiloto:** pregunta → intención → *tool call* → `ReportService` → **cifra validada** → explicación del LLM. **El LLM nunca inventa la cifra.** Sin SQL directo desde el LLM.
Herramientas (lista única): `getBudgetSnapshot · getCategoryState · getAccountBalance · getTransactions · getSpendingReport · getIncomeReport · getGoals · getNetWorth · simulateBudgetMove · simulateGoal`.
Persistencia: `ai_classifications`, `ai_feedback`, `ai_runs`; **toda sugerencia es reversible**. Minimización de datos: A13.7. Entrada de terceros (memos, CSV) = dato, no instrucción.

## C7. OCR de recibos
`cámara → preprocesado → OCR → comercio/fecha/total → líneas → sugerencia de categoría → revisión → transacción`. **Nunca** publica automáticamente por defecto. La imagen se guarda **solo si el usuario lo decide**; se separan `receipt_metadata`, `receipt_file` y `transaction`.

## C8. Motor de automatización
Tabla `automation_rules`. Ej.: `SI payee == Netflix ENTONCES categoría = Suscripciones` · `SI monto > 500 Y categoría == Compras ENTONCES notificar`. Disparador `transaction.created`. Prioridad: `regla exacta del usuario → regla histórica → clasificador → IA`.

## C9. Alertas inteligentes y anomalías
- Tipos: `CRITICAL, ACTION_REQUIRED, INSIGHT, POSITIVE, INFO` (mismo conjunto que Atención, 02.6.4). Ej.: *"Transporte va 38% por encima de tu ritmo normal."* **Cada alerta tiene acción o explicación.**
- Anomalías: monto inusual · comercio desconocido · cargo duplicado · aumento de suscripción · aceleración de gasto. **Nunca** "fraude confirmado": se muestra *"Posible anomalía"*.

## C10. Offline (Spec 23)
`UI → almacén local → cola de outbox → sync → servidor`. Los IDs deben poder generarse offline (UUID/UUIDv7, A4). La escritura offline respeta idempotencia y `version` (A4).

## C11. Gamificación
**Premiar:** registro constante, revisión semanal, conciliación, avance de metas. **No premiar:** deuda, gasto impulsivo ni gasto artificialmente bajo.

## C12. Segundo checkpoint — "YA MEJORA YNAB"
Dashboard action-first · divulgación progresiva · mejores explicaciones de tarjeta · conciliación inteligente · metas avanzadas · multi-moneda · gastos compartidos · categorización con IA · copiloto.

---

# PARTE N — ESCENARIOS DORADOS (GOLDEN SCENARIOS)

> Se guardan como JSON en `tests/golden/*.json` y los reutilizan unit, integración y E2E. Montos en unidades mayores por legibilidad; en BD son `amount_minor`. Todo motor debe reproducirlos **exactamente**.

| ID | Escenario | Entrada | Esperado |
|---|---|---|---|
| **GS-01** | Primer presupuesto | Registro → crear presupuesto → corriente **1.000** → categoría Comida → asignar **300** → gasto **100** | Comida disponible **200** · Por asignar **700** |
| **GS-02** | Split válido | Compra **150** = Comida 100 + Hogar 30 + Personal 20 | Σ splits = 150 · restante 0 · *Guardar* habilitado |
| **GS-03** | Transferencia | Corriente 1.000, Ahorros 0, transferir **500** | Corriente 500 · Ahorros 500 · Por asignar sin cambio |
| **GS-04** | Tarjeta financiada | Comida asignado 300 · compra con tarjeta **100** | Comida disponible 200 · Pago de tarjeta disponible 100 · Por asignar sin cambio |
| **GS-05** | Sobregasto con tarjeta | Comida disponible **50** · compra con tarjeta **100** | credit overspending 50 · reservado 50 · **no** es sobregasto en efectivo |
| **GS-06** | Conciliación | app confirmado 1.000 · banco confirmado 1.000 | diferencia 0 · conciliación completa |
| **GS-07** | Arrastre | Sept.: Comida asignado 500, gasto 400 | Oct. apertura **100** |
| **GS-08** | Sobregasto en efectivo | Comida 100 · gasto en efectivo 150 | Sept. disponible −50 · Oct. disponible 0 · impacto en Por asignar −50 · advertencia urgente |
| **GS-09** | Auto-Assign | Por asignar 1.300 · alquiler programado 800 · meta Comida 300 · meta Transporte 200 | Vista previa: Alquiler 800 / Comida 300 / Transporte 200 · al confirmar Por asignar = 0 |
| **GS-10** | Doble cron | Procesar programadas dos veces | exactamente **1** transacción |
| **GS-11** | Doble importación | Confirmar el mismo lote dos veces | sin transacciones duplicadas (`IMPORT_BATCH_ALREADY_APPLIED`) |
| **GS-12** | Dos dispositivos | Por asignar **400** · dos peticiones "asignar 300" | **`strict_budgeting` ON:** una tiene éxito, la otra `ASSIGN_EXCEEDS_AVAILABLE`. **OFF (defecto):** se serializan (bloqueo del mes), ambas se aplican, Por asignar = −200 en rojo con advertencia crítica y **ningún evento perdido**. Misma categoría/misma versión ⇒ una recibe `CONFLICT_VERSION`. Nunca un resultado dependiente de la carrera |
| **GS-13** | Editar conciliada | Cambiar monto tras conciliar | bloqueado (`TRANSACTION_RECONCILED_LOCKED`) |
| **GS-14** | Split parcial | Guardar un split que no suma | transacción y splits **sin cambios** (rollback) |
| **GS-15** | Pago con déficit | Saldo tarjeta −850 · pago disponible 600 | `UNDERFUNDED 250` (no rojo) |
| **GS-16** | Sobrepago de pago | Pago disponible 400 · pago realizado 500 | pago disponible −100 · `CASH_OVERSPENT` |
| **GS-17** | Meta semanal | Meta 100/semana · el día elegido cae 5 veces en el mes | requisito del mes **500** |
| **GS-18** | Promedio con historia corta | Solo 4 meses válidos | promedio de **4** (no se inventan datos) |

---

# PARTE Y — PROCESO SPEC KIT, DEFINITION OF DONE Y PUERTAS DE RELEASE

## Y1. Definition of Done
Una spec **no** está terminada porque compile. Debe tener: `spec.md · plan.md · tasks.md · migraciones · capa de servicio · API · UI · tests unitarios · tests de integración · test E2E · cobertura de casos borde · auditoría · autorización`.

## Y2. Spec Kit — por cada feature
Carpeta con `spec.md`, `plan.md`, `tasks.md`, `checklist.md`. Orden: `clarify → plan → checklist → tasks → analyze → implement → converge`. Las Specs 05–12 se completan con `/speckit.clarify` hasta el nivel de detalle de 01–04.

## Y3. Granularidad y formato de las tasks
No: `T07 Implementar tarjetas de crédito`. Sí: `T07.1 Crear la categoría de pago al crear la cuenta de tarjeta · T07.2 Calcular compra financiada · T07.3 Calcular sobregasto con tarjeta · T07.4 Persistir pago · T07.5 DTO de cobertura · T07.6–T07.8 tests`.

```markdown
### T07.2
Goal: Implement funded credit-card purchase behavior.
Dependencies: T03 account engine · T04 transactions · T05 budget engine
Backend: Update CreditCardService. Move funded category amount to payment category.
Tests: funded purchase · partial funding · refund
Acceptance: RTA unchanged and payment category increases exactly by funded amount.
```

## Y4. Prompt de implementación para la IA (antes de modificar código financiero)

```text
1 Lee la constitución. 2 Lee el spec objetivo. 3 Lee las invariantes de dominio. 4 Lee los specs dependientes.
5 Busca en el repo implementaciones existentes. 6 Identifica la fuente de verdad. 7 No inventes reglas financieras.
8 Implementa solo el alcance de la task. 9 Escribe primero tests de dominio. 10 Añade tests de integración.
11 Añade/actualiza E2E. 12 Ejecuta los chequeos de invariantes. 13 Reporta cualquier ambigüedad en lugar de elegir en silencio.
```
**Regla de UI para la IA:** *la UI puede mostrar valores financieros pero no es dueña de su cálculo.* Para bugs: usar A11.2 (no parchear solo la UI).

## Y5. Secuencia de desarrollo obligatoria
`SPEC → REGLAS DE DOMINIO → INVARIANTES → MODELO DE DATOS → TESTS DEL MOTOR PURO → SERVICIO DE APLICACIÓN → API → UI → E2E → CONVERGE`.
**No:** `UI → improvisar SQL → parchear el motor → inventar reglas`.

## Y6. Orden de implementación de la Fase 1 (bloques → specs)

| Bloque | Contenido | Spec(s) |
|---|---|---|
| A | Identidad · Presupuestos · Categorías · Cuentas | 01, 02, 03 |
| B | Transacciones · Splits · Transferencias | 04 |
| C | Motor de presupuesto · Arrastre · Sobregasto | 05 (05A–05D, 05H) |
| D | Metas · Auto-Assign · Programadas | 06, 05E–05F, 10 |
| E | Tarjetas de crédito · Conciliación | 07, 08 |
| F | Importaciones · Reportes · Colaboración | 09, 11, 12 |

## Y7. Puertas de release
- **No hay release con un P0 financiero abierto** (A11.1).
- **Tarjetas** no salen sin: compra financiada · financiación parcial · sobregasto con tarjeta · pago · sobrepago · saldo positivo (BR-CC-070).
- **IA/OCR/UX agéntica** no empiezan hasta que pasen: RTA, arrastre, tarjeta, conciliación, transferencia, split, meta, importación.

## Y8. Checklist de aceptación de la Fase 1

```text
[ ] Registro/login (01)            [ ] Crear presupuesto (02)        [ ] Crear cuenta + saldo inicial (03)
[ ] Grupos y categorías (02)       [ ] Asignar dinero (05)           [ ] Mover dinero (05)
[ ] Transacción (04)               [ ] Split (04)                    [ ] Transferencia (04)
[ ] Reembolso (04)                 [ ] Arrastre (05)                 [ ] Sobregasto en efectivo (05)
[ ] Sobregasto con tarjeta (05/07) [ ] Metas (06)                    [ ] Auto-Assign (05)
[ ] Transacciones programadas (10) [ ] Tarjetas de crédito (07)      [ ] Conciliación (08)
[ ] CSV (09)                       [ ] OFX/QFX (09)                  [ ] Emparejamiento (09)
[ ] Reportes (11)                  [ ] Colaboración (12)             [ ] Auditoría (A7)
[ ] RLS (A8.3)                     [ ] E2E (Parte N)
```

## Y9. Checkpoints
1. **"Ya funciona como YNAB"** — este flujo debe correr **sin correcciones manuales internas**: `crear presupuesto → agregar banco → recibir sueldo → asignar cada monto → registrar gastos → dividir una compra → usar tarjeta → pagar tarjeta → crear meta → programar factura → importar movimientos → conciliar banco → ver reportes`. Si requiere parches manuales, el core no está terminado.
2. **"Ya mejora YNAB"** — Parte C, C12.

## Y10. Documentación interna a crear
`docs/domain/budget-glossary.md · transaction-lifecycle.md · credit-card-model.md · goal-engine.md · reconciliation.md · import-engine.md · rta.md · invariants.md`. El **glosario** define: Por asignar · Asignado · Actividad · Disponible · Arrastre · Sobregasto en efectivo · Sobregasto con tarjeta · Meta · Falta asignar · Sobre-financiado · Confirmada · Pendiente · Conciliada · Cuenta del presupuesto · Cuenta de seguimiento (base: A1).

## Y11. Definición final de la Fase 1 y resumen operativo
La Fase 1 está completa cuando Bolsilludo maneja, **de forma determinista y auditable**: presupuesto, categorías, cuentas, ingresos, gastos, splits, transferencias, Por asignar, asignaciones, arrastre, sobregasto en efectivo y con tarjeta, metas, Auto-Assign, programadas, tarjetas, reembolsos, conciliación, importaciones, reportes y colaboración — respetando: **exactitud del dinero · atomicidad · idempotencia · autorización · auditabilidad · seguridad ante concurrencia**.

```text
No inventar comportamiento.       No calcular dinero en la UI.        No crear una segunda fuente de verdad.
No hacer escrituras parciales.    No ignorar la moneda.               No ignorar la concurrencia ni la idempotencia.
No editar en silencio datos conciliados.   No mezclar sobregasto de efectivo y de tarjeta.
No tratar transferencias como ingresos/gastos.   No construir IA sobre un ledger incorrecto.
```
Prioridad de ingeniería: `CORRECCIÓN → CONSISTENCIA → AUDITABILIDAD → CLARIDAD → VELOCIDAD → AUTOMATIZACIÓN → DELEITE`.

---

# PARTE Z — DECISIONES DE FUSIÓN (ADR-M), MAPA DE ORIGEN Y REFERENCIAS

## Z1. Decisiones tomadas al fusionar (requieren tu aprobación)

Cuando los dos planes decían cosas distintas, se eligió una y se dejó rastro. La IA **no puede cambiarlas sin ADR**.

| ADR | Tema | Plan 1 (detalle 01–12) | Plan 2 (profundo) | **Decisión en este documento** |
|---|---|---|---|---|
| **ADR-M1** | Roles | `OWNER/ADMIN/EDITOR/VIEWER` | `OWNER/EDITOR/VIEWER`; solo OWNER invita | **4 roles.** `ADMIN` gestiona miembros y ajustes (sin tocar `OWNER`); solo `OWNER` transfiere/archiva/elimina (Spec 12) |
| **ADR-M2** | `category_months` | Solo `assigned_minor`; *prohíbe* guardar disponible/actividad | Guarda `available`, `activity`, sobregastos, `goal_*` | **Solo `assigned_minor`** (+ `version`). Lo demás se deriva; caché opcional aparte, nunca fuente de verdad (05.5) |
| **ADR-M3** | Tabla `budget_months` | No existe; meses implícitos | `budget_months(budget_id, month)` | **No se crea** (sin datos propios). Se añade si aparecen notas/snapshots por mes |
| **ADR-M4** | Estados de transacción | `PENDING/CLEARED/RECONCILED/VOIDED` + `is_approved` | `PENDING_EXTERNAL/UNCLEARED/CLEARED/RECONCILED/VOIDED` | **4 estados del Plan 1.** `UNCLEARED` ≡ `PENDING`; `PENDING_EXTERNAL` vive solo en staging de importación (BR-IMP-020) |
| **ADR-M5** | Tarjeta → tarjeta | `CC_TO_CC_UNSUPPORTED` en Fase 1 | Incluye transferencia de saldo Visa→Mastercard | **Bloqueada en Fase 1**; la regla (no mover pagos disponibles solos) queda especificada (BR-CC-060) para habilitarla con flag |
| **ADR-M6** | Eventos de asignación vs `budget_movements` | `budget_movements` (mover dinero) | `budget_assignment_events` + `movement_group_id` | **Ambos, unificados:** eventos (fuente del histórico) + `budget_movements` como cabecera del movimiento, ligados por `movement_id` (05.5) |
| **ADR-M7** | Doble asignación concurrente | `version` ⇒ `CONFLICT_VERSION`; `strict_budgeting` OFF | "una gana, la otra falla; no RTA −200" | **Depende de `strict_budgeting`** (GS-12): ON ⇒ rechazo; OFF ⇒ serializado y determinista con advertencia; misma fila ⇒ `CONFLICT_VERSION` |
| **ADR-M8** | Editar conciliadas | Bloqueo suave + `unlockReconciled` auditado | "No se desconcilia; crear corrección" | **Ambos:** diálogo con *Crear corrección / Duplicar y reemplazar / Desbloquear / Cancelar* (BR-TRX-062) |
| **ADR-M9** | Préstamos | `LOAN` = seguimiento; Debt Planner en Spec 21 | `loan_accounts/loan_details/schedule` en Fase 1 | **Seguimiento en Fase 1** + extensión 07-L (`loan_details`, simulador) |
| **ADR-M10** | Numeración | `01-identity … 12-collaboration` | Bloques A–F con otra numeración | **Numeración del Plan 1** (la del repo); bloques A–F mapeados en Y6 |
| **ADR-M11** | Columna de moneda | `currency` | `currency_code` | **`currency`** (`CHAR(3)`); mismo significado |
| **ADR-M12** | Auditoría | `audit_events(before, after, source, device_id, ip_hash)` | `before_json/after_json` | **Esquema del Plan 1** + `engine_version` (Plan 2) |
| **ADR-M13** | Errores | Catálogo A6 | Otro nombre para varios | **Códigos del Plan 1**; equivalencias en A6.1 |
| **ADR-M14** | `source` y `kind` | `kind` + `source ∈ {manual,import,scheduled,ai}` | `source ∈ {MANUAL,BANK_SYNC,IMPORT,SCHEDULED,SYSTEM,ADJUSTMENT}` | **`kind`** (standard/transfer/starting_balance/reconciliation_adjustment) **+ `source`** ampliado con `bank_sync` y `system` |
| **ADR-M15** | Severidad de atención | 4 niveles | 5 niveles (con `POSITIVE`) | **5 niveles** |
| **ADR-M16** | Idempotencia en programadas | `UNIQUE(scheduled_id, occurrence_date)` | `UNIQUE(schedule_id, occurrence_key)` | **`(scheduled_id, occurrence_date)`**; `occurrence_key` es derivado |
| **ADR-M17** | Balances en `accounts` | Vista derivada (ADR-G13) | Columnas `working_balance_minor`, `cleared_balance_minor` | **Derivados** (03.5.2); no hay columnas mutables |

## Z2. ADR-G citadas en el documento base

El listado original de ADR-G (que el Plan 1 situaba en su "Parte Z") **no venía en los archivos recibidos**; solo se conservan las que el texto cita, con el sentido que tienen allí:
G3 reembolso en tarjeta sale del pago · G4 tarjeta sin saldo inicial positivo y sin tarjeta→tarjeta · G5 perfil creado por trigger · G7 bloqueo suave de conciliadas · G8 fechas futuras fuera del saldo de hoy · G12 `strict_budgeting` apagado por defecto · G13 saldos derivados · G14 `inflow_rta` como fila real · G16 moneda inmutable con cuentas · G17 `LOAN` como seguimiento · G18 traspasos sin fila de `payees` · G19 splits sin transferencias en Fase 1.

## Z3. Mapa de qué se unificó y dónde quedó (nada se perdió)

| Plan profundo (§) | Destino en este documento |
|---|---|
| §0–4 problema, ledger/plan/derivado, identidad del dinero, flujo | A12, regla de oro 11–12 |
| §2 dinero, §143–144 FX | A2, C2 |
| §5–6 mes y categoría-mes | 05.2, 05.5, ADR-M2/M3 |
| §7–10 disponible, arrastre, sobregasto | 05.4 BR-ENG-010…032, A5.2 |
| §11–14 RTA, fuentes, ingreso directo a categoría | 05.4 BR-ENG-040…043, A5.4 |
| §15–17 jerarquía, tabla de categorías, salud | BR-CAT-050, 02.5, 05.4 (enum de salud) |
| §18–23 asignación, mover, reset, meses futuros | 05.4 BR-ENG-020/021/050…054, 05.5 |
| §24–32 Auto-Assign y estrategias | 05.4 BR-ENG-060…068 |
| §26–27 Underfunded y ranking | 05.4 BR-ENG-070 |
| §33–44 metas, cadencias, snooze, DTO, progreso | Spec 06 |
| §45–48 cuentas y saldos | Spec 03 (ya cubierto por el Plan 1) |
| §49–51 ciclo de vida, tabla, source | Spec 04 (04.4, 04.5), ADR-M4/M14 |
| §52–53 payees y normalización | 04.4 BR-PAY, BR-PAY-007 |
| §54–56, 171 splits | 04.4 BR-TRX-040…046, 04.7.3, A10.1 |
| §57–60 transferencias | 04.4 BR-TRX-050…058, 04.6.1 |
| §61–62 reembolsos y reimbursements | 04.4 BR-TRX-070, BR-TRX-074, Spec 10 |
| §63–66 programadas | Spec 10 |
| §67–76 sincronización bancaria, matching, CSV/OFX | Spec 09 |
| §77–88 tarjetas | Spec 07 |
| §89–92 préstamos | 07-L |
| §93–98 conciliación | Spec 08 (+ BR-TRX-060…062) |
| §99–103, 161–163, 168–169 reportes y export | Spec 11 |
| §104–107, 243 colaboración, permisos, RLS | Spec 12, A8.3 |
| §108–117 API, DTOs, snapshot, motor puro | 05.6 |
| §118–126 concurrencia, idempotencia, ACID, errores, auditoría, outbox, jobs | A4, A6, A7, A13.1–2, 05.6.1 |
| §127–138, 166 UX (acción primero, glass, profundidad, búsqueda) | A9.8, A9.9, 02.7.3 |
| §139–142 metas en UI y metas inteligentes | 06.7, C1 |
| §145–147, 199–204 compartidos, activos, deuda | C3–C5 |
| §148–159, 205–210 IA, OCR, automatización, alertas, offline, gamificación | C6–C11 |
| §160, 211 edad del dinero | Spec 11 (BR-RPT-040) |
| §164–165 errores de dominio y borrado suave | A6/A6.1, A4 |
| §167 importadores YNAB | Spec 09 (`ImportAdapter`) |
| §170–189 pruebas y escenarios | A10.1, A11, Parte N |
| §190–198, 225–233, 244–247 proceso, DoD, gates, bugs | Parte Y, A11.1–A11.3 |
| §212 API de referencia (YNAB usa `/plans/{plan_id}`) | Nota: las rutas de Bolsilludo son `/api/v1/budgets/...`; **nombres de dominio ≠ nombres del proveedor**, pero la semántica se mantiene clara |
| §213–217 índices, unicidad, UUID, zona horaria, fecha financiera | 02.5–04.5, A3, A4 |
| §218–224, 234–235 caché, rendimiento, seguridad, versión del motor, migraciones | A13 |
| §236–243 "specs actuales a reescribir" | Cabeceras de Specs 05–12 |

*Se eliminaron además los marcadores de citas automáticas del Plan 2 (`fileciteturn…`, `citeturn…`), que no eran contenido; las afirmaciones de YNAB que respaldaban quedaron marcadas 🟦 y con las referencias de Z5.*

## Z4. Pendiente / a decidir por el dueño

1. Aprobar o cambiar **ADR-M1…M17** (sobre todo M1, M2, M5, M7, M8, M9).
2. Ampliar las Specs 05–12 al nivel completo de 01–04 (SQL exhaustivo, Given/When/Then, wireframes) con `/speckit.clarify`.
3. El listado original de **ADR-G** y el **plan maestro/constitución** (`plan §…`, `P1–P15`, `I1–I7`, "Parte Z" original) no estaban en los archivos: hay que traerlos o regenerarlos para que las referencias cierren.
4. Reglas marcadas 🟨 nuevas de esta fusión: ranking/algoritmo de Underfunded (BR-ENG-062/070), huella de importación (BR-IMP-010), reparto de `funded` entre tarjetas (BR-CC-030), una meta activa por categoría, vigencia de invitaciones (7 días), definiciones por reporte (11.4).

## Z5. Referencias (documentación oficial de YNAB consultada por los dos planes)

- Asignar dinero / Ready to Assign: https://support.ynab.com/en_us/assigning-your-money-a-guide-SypgkrNJi
- Auto-Assign: https://support.ynab.com/en_us/auto-assign-a-guide-r1gBNbBJo
- Targets: https://support.ynab.com/en_us/getting-started-with-targets-ryAEP08xC · Cómo usar targets: https://support.ynab.com/how-to-use-targets-rk5kkI9ks · Progress bars: https://support.ynab.com/en_us/progress-bars-a-guide-SkDEhot09
- Tarjetas de crédito: https://support.ynab.com/en_us/handling-credit-cards-overview-ry7cNub1s · Float: https://support.ynab.com/en_us/float-BytrIDZJi · Sobregasto: https://support.ynab.com/overspending-in-ynab-a-guide-ryWoxEyi · Pago en rojo: https://support.ynab.com/en_us/when-your-credit-card-payment-category-is-red-a-guide-SJDSr3Q1i
- Conciliación: https://support.ynab.com/en_us/finding-your-cleared-balance-to-reconcile-an-overview-Bk27l_A9 · Desconciliar: https://support.ynab.com/en_us/can-i-unreconcile-a-transaction-SJ0NquLye
- Pendientes: https://support.ynab.com/en_us/pending-transactions-an-overview-Bk0WoOcA5 · Importación directa: https://support.ynab.com/en_us/how-direct-import-works-H1IGYLgnxl
- Tipos de cuenta: https://support.ynab.com/en_us/account-types-an-overview-BkmGM0qCq · Préstamos: https://support.ynab.com/en_us/loan-accounts-a-guide-HkNSkPHJi
- Edad del dinero: https://support.ynab.com/en_us/age-of-money-H1ZS84W1s
- API: https://api.ynab.com/ · https://api.ynab.com/v1
- Adicionales del Plan 1 (ver 0.5): glosario `ynab-glossary-a-guide-BJd80SORq`, efectivo `handling-cash-in-ynab-a-guide-BJVYYkXR9`, balance adjustments `balance-adjustments-a-guide-rko4OwILs`, reconciling `reconciling-accounts-a-guide-BJFE3fHys`, credit card overspending `credit-card-overspending-an-overview-HkMGpSbJs`.
