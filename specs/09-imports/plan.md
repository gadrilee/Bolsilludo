# PLAN — Imports

## Fases
1. **Database**: Tablas auxiliares para rastrear IDs importados y evitar duplicados de origen.
2. **Backend**: Parsers para OFX, QFX y CSV. Motor de similitud (Matching) por monto, fecha y payee.
3. **Frontend**: Wizard de subida de archivos y mapping de columnas CSV.
4. **Validación**: Idempotencia al procesar `import_id`.
