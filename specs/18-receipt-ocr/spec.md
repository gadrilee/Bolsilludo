# SPEC 18 — Receipt OCR

## WHAT
- Extraer datos de facturas o tickets de compra subiendo una foto.
- Detecta montos, fecha, comercio y los elementos para hacer un "Split" rápido.

## WHY
- Evita digitar manualmente el ticket largo del supermercado.

## HOW
- API de Visión (OpenAI Vision o Google Cloud Vision) para procesar la imagen y devolver JSON estructurado.
