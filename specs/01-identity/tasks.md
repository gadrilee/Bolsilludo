# TASKS

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
