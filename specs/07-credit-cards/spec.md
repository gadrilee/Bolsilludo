# SPEC 07 — CREDIT CARDS (TARJETAS) + PRÉSTAMOS

**Dependencias:** 03, 04, 05. **Hito:** M3. **Prefijos:** `FR-CC`, `BR-CC`, `AC-CC`.
La spec 07 original reconocía la categoría de pago pero no definía estados de déficit, sobrepago, transferencia, *float* ni sobregasto con tarjeta. Se divide en: creación de cuenta · vínculo de categoría de pago · compra financiada · compra sin fondos · pago · reembolso · sobrepago · transferencia de saldo · *float* · déficit · conciliación.

## 07.1 Cómo funciona YNAB (🟦)

- Al crear una tarjeta aparece automáticamente su **categoría de pago**. Una compra con tarjeta mueve dinero de la categoría de gasto **a** la categoría de pago; así el dinero para pagar queda reservado.
- **Sobregasto con tarjeta** = compra sin fondos: es deuda nueva. La categoría de pago se ve **roja** solo si envías **más de lo disponible** en ella (pago excesivo); la falta de fondos para cubrir la deuda es *Underfunded* (amarillo), no rojo.
- **Float:** usar ingreso actual para cubrir gasto anterior de la tarjeta.
- Un **saldo positivo** (sobrepago) tiene comportamiento especial; una **transferencia de saldo** entre tarjetas **no** mueve automáticamente fondos entre categorías de pago.
- **Préstamos** se distinguen de tarjetas; se puede vincular una categoría a un préstamo (calculadora de pago, *Record Payment*).

## 07.2 Qué hará Bolsilludo

| Capacidad | Tipo |
|---|---|
| Vínculo **explícito** `tarjeta → categoría de pago` (`categories.linked_account_id`), nunca por nombre | 🟦 paridad |
| Estados de tarjeta: financiada, sin fondos, déficit, sobrepago, saldo positivo, riesgo de *float* | 🟦 + 🟩 |
| Métrica `credit_card_float_risk` con aviso "Posible *float* de tarjeta" y acciones *Ver por qué / Corregir plan* | 🟩 mejora |
| Tarjeta de cuenta con cobertura de pago (`Cubierto 80%`) y botones *Pagar · Cubrir déficit · Conciliar* | 🟩 mejora |
| Inspector de tarjeta (compras, reembolsos, pagos, sobregastos, pago disponible, saldo) | 🟩 mejora |
| 🟨 `CC_TO_CC_UNSUPPORTED` en Fase 1 (ADR-G4): la **regla** de transferencia de saldo se especifica pero se habilita después detrás de un flag (ADR-M5) | Decisión |
| 🟨 Préstamos: `LOAN` es cuenta de **seguimiento (pasivo)** en Fase 1 (ADR-G17); `loan_details` y el simulador se entregan como extensión (07-L) y se amplían en el Debt Planner (Spec 21) | Decisión |

## 07.3 Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-CC-001 | Crear una cuenta `CREDIT_CARD` crea su categoría de pago en la misma transacción (FR-ACC-002). |
| FR-CC-002 | Una compra con tarjeta reduce el Disponible de su categoría y aumenta el pago disponible **solo por la parte financiada**. |
| FR-CC-003 | El sistema distingue sobregasto con tarjeta (amarillo) del de efectivo (rojo). |
| FR-CC-004 | Un pago (transferencia hacia la tarjeta desde cuenta on-budget no-tarjeta) reduce el pago disponible; no es un gasto de categoría. |
| FR-CC-005 | El sistema calcula déficit de pago, cobertura y riesgo de *float*, y los explica. |
| FR-CC-006 | El sistema representa el saldo positivo por sobrepago. |

## 07.4 Reglas de negocio

| ID | Regla |
|---|---|
| BR-CC-001 | La relación es `credit_card_account_id → payment_category_id` **explícita**. Nunca se identifica la categoría de pago por su nombre (`"Visa Payment"`). El pago **no** se registra como categoría de gasto (BR-TRX-012). |
| BR-CC-010 | **Compra financiada:** `Comida disponible 500` + compra `100` con tarjeta ⇒ `Comida 400`, `Pago disponible +100`, saldo de tarjeta `−100` más negativo. **Por asignar no cambia.** |
| BR-CC-011 | **Compra sin fondos:** `Comida disponible 50` + compra `100` ⇒ `financiado en efectivo 50`, `credit_overspent 50`, `Pago disponible +50`, `deuda adicional 50`. |
| BR-CC-020 | **Pago:** transferencia `Corriente −500 / Tarjeta +500` ⇒ saldo de tarjeta con menos deuda y `pago disponible −500`. |
| BR-CC-021 | **Déficit (Underfunded):** `saldo −850`, `pago disponible 600` ⇒ `UNDERFUNDED 250`. **No** es sobregasto en efectivo. |
| BR-CC-022 | **Sobrepago:** `pago disponible 400`, se paga `500` ⇒ `pago disponible −100`, estado `CASH_OVERSPENT` (rojo). |
| BR-CC-030 | **Reparto entre tarjetas** (referenciado por A5.3): el `funded(c,M)` de una categoría se reparte entre las tarjetas con `credit_net > 0` **proporcionalmente** a su `credit_net`, con la política de redondeo §140 (`floor` + resto a la **última** tarjeta en orden estable `position, id`). 🟨 |
| BR-CC-031 | **Reembolso en tarjeta:** vuelve a la categoría original y **sale** de la categoría de pago (ADR-G3, A5.2). |
| BR-CC-040 | **Float** (`credit_card_float_risk`): señal cuando `pago disponible < deuda de la tarjeta` **y** el usuario depende repetidamente del ingreso siguiente para pagar completo. Es una **advertencia**, nunca un bloqueo. |
| BR-CC-050 | **Saldo positivo** (sobrepago, `saldo > 0`): estado `POSITIVE_CREDIT_BALANCE`; **no** se considera deuda por pagar. |
| BR-CC-060 | **Transferencia de saldo** (`Visa −1000 / Mastercard +1000`): **no** se transfieren automáticamente los "Pago disponible" entre categorías de pago; el sistema explica y exige asignar/corregir. En Fase 1 devuelve `CC_TO_CC_UNSUPPORTED` (ADR-G4, ADR-M5). |
| BR-CC-070 | **Release gate:** las tarjetas no salen sin pruebas de: compra financiada, financiación parcial, sobregasto con tarjeta, pago, sobrepago y saldo positivo (Parte Y). |

### Estados de tarjeta (enum de dominio)

`FUNDED_PURCHASE · PARTIALLY_FUNDED · CREDIT_OVERSPENT · PAYMENT_UNDERFUNDED · PAYMENT_OVERSHOOT · POSITIVE_CREDIT_BALANCE · FLOAT_RISK`

### Préstamos (extensión 07-L, 🟨)

- Cuenta `LOAN` (seguimiento). Tablas: `loan_details` (`principal_minor, interest_rate, interest_type, minimum_payment_minor, due_day, original_balance_minor, term_months, start_date`) y `loan_payment_schedule`.
- **Amortización mensual:** `interés_periodo = principal × tasa_periódica` · `capital_pagado = pago − interés_periodo` · `nuevo_principal = principal − capital_pagado`. Si `pago < interés` ⇒ el principal **aumenta** y el simulador lo **alerta**.
- UI: `Restante 10.000 · Tasa 12% · Mínimo 500 · Fin proyectado 2028-10 · [Registrar pago] [Simular +100]`. El simulador **nunca** modifica el libro de préstamos.

## 07.5 Modelo de datos

Usa `accounts` (03.5) y `categories.linked_account_id` (02.5; `unique` por tarjeta ya definido). Estado derivado (no se persiste): `CreditCardState` del motor. Extensión 07-L: `loan_details`, `loan_payment_schedule` (RLS A8.3). `by-card` funded se calcula en el motor (BR-CC-030), no se almacena.

## 07.6 Backend

- `createAccount(CREDIT_CARD)` (03.6.1) crea el grupo "Pagos de tarjetas" y la categoría vinculada.
- Un **pago** es `transferMoney` a una tarjeta (04.6.1): el motor calcula sus efectos; no hay comando "pagar" que escriba dinero por otra vía.
- **Query:** `getCreditCardStatus(accountId, month)` → `CreditCardStatusDTO`:

```ts
type CreditCardStatusDTO = {
  accountId: string; workingBalance: Money; paymentAvailable: Money; coveragePct: number;
  status: 'FUNDED'|'PAYMENT_UNDERFUNDED'|'PAYMENT_OVERSHOOT'|'POSITIVE_CREDIT_BALANCE';
  underfundedAmount: Money; floatRisk: boolean;
  inspector: { purchases: Money; refunds: Money; payments: Money; creditOverspending: Money; cashOverspending: Money };
  explanation: { label: string; amount: Money }[];       // "¿Por qué mi pago está en falta?"
};
```
- Funciones puras: `credit-card.ts` (`fundedByCard`, `paymentAvailable`, `paymentStatus`, `floatRisk`).

## 07.7 UI

`Visa Gold · Saldo −1.250 · Pago disponible 1.000 · Cobertura 80% · Estado: Falta 250 · [Pagar tarjeta] [Cubrir déficit] [Conciliar]`. Aviso de *float*: *"Posible *float* de tarjeta — tu plan actual podría depender de ingresos futuros para una deuda existente. [Ver por qué] [Corregir plan]"*. Inspector con las 7 cifras del DTO. Diferenciar **rojo = efectivo** y **amarillo = tarjeta/falta** con icono + texto (A1).

## 07.8 Casos borde

Sobregasto mixto en la misma categoría · reembolso mayor que lo financiado · dos tarjetas con la misma categoría (BR-CC-030) · cerrar tarjeta con pago disponible > 0 (03.8) · saldo inicial de tarjeta con deuda previa (no mueve dinero, 03.1) · pago mayor que la deuda (`POSITIVE_CREDIT_BALANCE`) · compra con tarjeta en categoría archivada.

## 07.9 Criterios de aceptación

```text
AC-CC-01  Given Comida asignado 300 y compra con tarjeta de 100
          Then Comida.disponible 200 y Pago de tarjeta disponible 100, Por asignar sin cambio.

AC-CC-02  Given Comida disponible 50 y compra con tarjeta de 100
          Then credit_overspent 50, pago reservado 50, y NO es sobregasto en efectivo.

AC-CC-03  Given saldo −850 y pago disponible 600
          Then estado UNDERFUNDED 250 con explicación "Deuda 850 · Reservado 600 · Falta 250".

AC-CC-04  Given pago disponible 400 y pago realizado de 500
          Then pago disponible −100 y estado CASH_OVERSPENT.

AC-CC-05  Given un pago mayor que la deuda
          Then saldo > 0 y estado POSITIVE_CREDIT_BALANCE (no se muestra como deuda).

AC-CC-06  Given transferencia de saldo entre tarjetas (flag ON)
          Then los pagos disponibles NO se mueven solos y se explica cómo corregir.

AC-CC-07  Given un reembolso de tarjeta en Compras
          Then Compras.disponible sube y el pago disponible baja por la parte financiada.
```

## 07.10 Tests requeridos

Unit por cada BR-CC · property: `Σ funded_por_tarjeta = funded(c)` · integración: `createAccount` crea el vínculo; el pago no crea gasto de categoría · E2E: GS-04, GS-05, GS-15, GS-16 (Parte N) · **release gate** BR-CC-070.

## 07.12 No hacer

🟥 identificar la categoría de pago por nombre · 🟥 registrar el pago como gasto de categoría · 🟥 mezclar sobregasto de efectivo y de tarjeta · 🟥 mover automáticamente pagos disponibles entre tarjetas · 🟥 tratar un saldo positivo como deuda · 🟥 modificar el libro de préstamos desde el simulador · 🟥 liberar tarjetas sin las 6 pruebas de BR-CC-070.

---
