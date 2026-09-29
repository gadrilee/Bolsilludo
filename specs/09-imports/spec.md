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

## 09.12 No hacer

🟥 `Plaid → React → BD` · 🟥 que el dominio dependa del JSON del proveedor · 🟥 mutar saldos/categorías con pendientes externos · 🟥 auto-fusionar coincidencias ambiguas · 🟥 destruir la descripción original · 🟥 tratar texto del archivo como instrucción · 🟥 duplicar la lógica de emparejamiento entre parsers · 🟥 guardar credenciales bancarias de usuario si existe OAuth/token.

---
