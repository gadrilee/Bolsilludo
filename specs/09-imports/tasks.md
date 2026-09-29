# TASKS

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
