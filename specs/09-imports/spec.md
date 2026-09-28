# SPEC 09 — Imports (CSV/OFX)

## WHAT
- Importar transacciones masivamente mediante archivos CSV, OFX o QFX bancarios.
- Motor de Matching: Emparejar transacciones importadas con transacciones manuales existentes para evitar duplicados.
- Auto-clasificación por `Payee`.

## WHY
- Reduce la fricción de entrada manual de datos.
- Facilita la adopción del producto al importar histórico de otros sistemas.

## HOW
- Tabla `transaction_imports` y `transaction_matches`.
- Workers o server actions para procesar parsing.
