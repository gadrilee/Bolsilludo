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

## 01.12 No hacer

🟥 Webhooks para crear el perfil · 🟥 mensajes de error que distingan "correo no existe" · 🟥 guardar contraseñas o tokens en logs/`localStorage` · 🟥 truncar contraseñas · 🟥 confiar en `next` sin validar · 🟥 permitir crear presupuestos sin correo verificado · 🟥 lógica de autorización solo en el frontend.

---
