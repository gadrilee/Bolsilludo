# Financial Model & Policies — Bolsilludo

> Version: 1.0.0 | Iteration: I1 | Date: 2026-09-28
> Defines the representation of money, arithmetic handling, and the domain error model.

---

## 1. Representation of Money (Integer Money)

In accordance with Constitution P2, money is never stored or manipulated as floating-point numbers (`float` or `double`).

### Storage
Money is stored using two fields:
- `amount_minor` (Integer/BigInt): The amount in the smallest unit of the currency.
- `currency` (String, length 3): The ISO 4217 currency code.

### Precision Map
The divisor for displaying the currency is defined per currency code, not hardcoded.
- `USD`: precision 2 (divisor 100) -> 1025 minor = $10.25
- `BOB`: precision 2 (divisor 100) -> 5000 minor = Bs. 50.00
- `JPY`: precision 0 (divisor 1) -> 500 minor = ¥500

---

## 2. Arithmetic and Rounding Policy

### General Rule
Addition, subtraction, and multiplication must be performed on the integer `amount_minor`.

### Division and Remainder Distribution
When division is required (e.g., splitting a cost 3 ways, or applying an FX rate), fractional minor units cannot exist. The system must deterministically distribute the remainder.

**Example: Splitting $100.00 (10000 minor) by 3**
- 10000 / 3 = 3333 with a remainder of 1.
- The system must allocate:
  - Line 1: 3333 ($33.33)
  - Line 2: 3333 ($33.33)
  - Line 3: 3334 ($33.34)
- **Prohibited:** Storing `3333.3333` in the database.

This logic will be handled by a pure function in `packages/money` (e.g., `distributeAmount(amount, parts)`).

### FX Conversion
When converting between currencies, the exact rate and timestamp must be stored.
`target_minor = round(source_minor * exchange_rate)`
The exact rounding strategy (Banker's rounding / Half-even) will be implemented in the `FXEngine`.

---

## 3. Domain Error Model

When a domain rule or invariant is violated, the domain layer must return a standardized error code rather than throwing a generic 500 or 400 HTTP error. These codes are mapped to user-friendly UI messages.

| Error Code | Description | User-facing meaning |
|---|---|---|
| `INSUFFICIENT_FUNDS` | Operation attempted to consume more available balance than exists (where strict limits apply). | "No tienes fondos suficientes para realizar esta operación." |
| `INVALID_SPLIT` | Violation of Invariant I1: Sum of splits does not equal parent. | "La suma de las divisiones ($X) no coincide con el total ($Y)." |
| `TRANSFER_CURRENCY_MISMATCH` | Violation of Invariant I7: Transfer between accounts of different currencies without FX rule. | "No se puede transferir directamente entre diferentes monedas." |
| `RECONCILIATION_MISMATCH` | Violation of Invariant I6: Attempted to reconcile with an active difference. | "Aún hay una diferencia de $X para conciliar esta cuenta." |
| `GOAL_INVALID` | Goal parameters are logically impossible (e.g., target date in the past, negative target). | "La configuración de la meta es inválida." |
| `PERMISSION_DENIED` | User lacks the required role for the budget/resource. | "No tienes permiso para modificar este elemento." |
| `DUPLICATE_TRANSACTION` | System detected an exact match (account + external ID + date + amount). | "Esta transacción ya fue registrada anteriormente." |
| `CONCURRENCY_CONFLICT` | Optimistic locking failure (e.g., two users modifying same category month). | "El presupuesto fue modificado desde otro dispositivo. Recargando..." |

---

## 4. Concurrency Policy

To prevent race conditions when updating monthly budget states:
- Use **Row-Level Locking** (`SELECT FOR UPDATE`) within database transactions.
- Use **Optimistic Concurrency Control** (`version` integer column) for client-side updates.
- If a client submits an update with a stale `version`, the server rejects it with `CONCURRENCY_CONFLICT`, prompting the client to refresh.
