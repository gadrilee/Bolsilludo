# SPEC 12 — Collaboration

## WHAT
- Invitar a otros usuarios (familia/pareja) a un presupuesto (`Workspace`).
- Roles de acceso (Owner, Editor, Viewer).
- Historial de cambios compartidos ("Audit Trail" a nivel usuario).

## WHY
- Las finanzas en el hogar se manejan en conjunto.
- Aumenta la retención del producto.

## HOW
- Relación N:M en tabla `budget_members` con roles.
- RLS (Row Level Security) estricto en la BD basado en el `user_id` y sus membresías.
