# SPEC 06 — Goals

## WHAT
- Metas de presupuesto para categorías.
- Tipos principales: Needed for Spending (con o sin fecha límite), Target Savings Balance, Monthly Builder.
- Cálculo de "Goal Required" y "Goal Remaining".

## WHY
- Permite a los usuarios planificar a largo plazo.
- Automatiza el cálculo de cuánto deben asignar cada mes para no atrasarse.

## HOW
- Tabla `goals` vinculada a `categories`.
- El Budget Engine (`05`) utiliza estas metas para calcular el status "underfunded".
