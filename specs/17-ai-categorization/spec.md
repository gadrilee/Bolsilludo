# SPEC 17 — AI Categorization

## WHAT
- Sugerir automáticamente la categoría de un gasto basándose en el `Payee` y la descripción.
- Aprende de los hábitos del usuario mediante LLM.

## WHY
- Hace que el proceso inicial y diario de registro sea casi mágico y requiera menos clics.

## HOW
- Usar un LLM (OpenAI / Anthropic) con "RAG" básico sobre las transacciones anteriores del usuario para predecir la categoría con mayor probabilidad.
