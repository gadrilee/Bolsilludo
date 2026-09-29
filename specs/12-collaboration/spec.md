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

## 12.12 No hacer

🟥 guardar el token de invitación en claro · 🟥 confiar la autorización solo al frontend · 🟥 permitir que un `ADMIN` gestione `OWNER` · 🟥 dejar un presupuesto sin `OWNER` · 🟥 borrar datos al quitar a un miembro · 🟥 mostrar la auditoría completa a `EDITOR/VIEWER`.


---
