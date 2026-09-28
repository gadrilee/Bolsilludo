# SPEC 01 — Identity & Profiles

## WHAT
- Gestión de acceso e identidad de usuario (Auth, Perfil, Preferencias).
- Permite registro, login, logout, password reset y verificación de email.
- Gestión de perfil de usuario incluyendo locale, timezone y moneda base preferida.

## WHY
- Todo sistema financiero necesita asociar la data privada a un usuario autenticado.
- Asegura la privacidad y persistencia multiplataforma.

## HOW
- Stack: Supabase Auth, PostgreSQL (users, profiles, sessions).
- UI: Formularios de Auth (Next.js server actions).
