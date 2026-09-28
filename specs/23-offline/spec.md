# SPEC 23 — Offline First

## WHAT
- La app puede abrirse, consultar el ledger y registrar transacciones sin internet (PWA).

## WHY
- Permite al usuario registrar compras en lugares sin señal (supermercados subterráneos, viajes).

## HOW
- Service workers, IndexedDB local (ej. ElectricSQL o base de datos local PouchDB/Dexie) para encolar transacciones y sincronizar cuando haya conexión.
