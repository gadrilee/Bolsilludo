# SPEC 11 — REPORTS (REPORTES, EDAD DEL DINERO, EXPORTACIÓN)

**Dependencias:** 03, 04, 05, 07. **Hito:** M4. **Prefijos:** `FR-RPT`, `BR-RPT`, `AC-RPT`.
La spec 11 original solo mencionaba los agregados básicos. Ahora **cada reporte** especifica: cuentas incluidas, tipos de transferencia excluidos, tratamiento de reembolsos, límite de fechas, moneda y agregación.

## 11.1 Cómo funciona YNAB (🟦)

- Reportes de gasto, ingresos vs gastos, patrimonio neto (*net worth*) y tendencias. Las **cuentas de seguimiento** entran al patrimonio neto pero **no** al plan (Por asignar).
- **Age of Money** = promedio de tiempo entre ganar y gastar dinero.

## 11.2 Qué hará Bolsilludo

| Capacidad | Tipo |
|---|---|
| Servicio único `ReportService` (no se hacen sumatorias complejas en React) | 🟩 mejora |
| Reportes: ingresos vs gastos · gasto por categoría/comercio · patrimonio neto · flujo de caja · saldos de cuentas · progreso de metas · tendencias · edad del dinero | 🟦 + 🟩 |
| Definición explícita por reporte (tabla 11.4) | 🟩 mejora |
| **Edad del dinero** como **analítica separada** del motor (no altera Por asignar) | 🟦 + 🟨 |
| Exportar CSV (Fase 1); JSON completo y PDF (Fase 2) con prevención de inyección de fórmulas | 🟩 mejora |
| 🟨 Tasa de ahorro y *runway* de efectivo son métricas **propias** (Fase 2) presentadas como estimaciones | Decisión |

## 11.3 Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-RPT-001 | Cualquier miembro (VIEWER+) consulta reportes con filtros de cuenta, fecha, estado (*cleared/uncleared*), comercio y categoría. |
| FR-RPT-002 | Los reportes de ingresos/gastos y gasto **excluyen transferencias**. |
| FR-RPT-003 | El patrimonio neto incluye cuentas de seguimiento sin afectar Por asignar. |
| FR-RPT-004 | `EDITOR+` exporta CSV de transacciones, categorías y cuentas. |
| FR-RPT-005 | El sistema calcula la edad del dinero y la muestra en `reports/age-of-money`. |

## 11.4 Reglas de negocio

| ID | Regla |
|---|---|
| BR-RPT-010 | **Transferencias excluidas** de Ingresos/Gastos y Gasto: `Corriente −500 / Ahorros +500` **no** aparece como *Gasto 500* ni *Ingreso 500*. Un **reembolso** no es ingreso (BR-TRX-070) salvo que vaya a `inflow_rta`. Un pago de tarjeta es transferencia (excluido). |
| BR-RPT-020 | **Patrimonio neto = Activos totales − Pasivos totales.** Efectivo/banco participan; cuentas de seguimiento se incluyen; tarjetas y préstamos son pasivos. |
| BR-RPT-030 | **Flujo de caja** separa: entradas operativas · salidas operativas · transferencias · movimientos de deuda ⇒ `Entradas · Salidas · Flujo neto`. |
| BR-RPT-040 | **Edad del dinero:** analítica separada. Primera versión reproducible: crear *lotes* de ingreso en efectivo; consumo **FIFO** por gasto en efectivo; `edad = fecha_gasto − fecha_lote`; promedio sobre eventos de gasto elegibles. **No** se usa para cambiar Por asignar. |
| BR-RPT-050 | **Tasa de ahorro** (Fase 2) `= (ahorro neto / ingresos) × 100`; la definición de "ahorro" es **configurable**; una transferencia a otra cuenta no es ahorro automático salvo que siga siendo patrimonio líquido. |
| BR-RPT-060 | **Runway** `= efectivo líquido / gasto esencial mensual promedio`, mostrado como estimación (*"≈ 3,2 meses"*), **nunca** como garantía. |

**Definición por reporte (🟨 salvo lo ya fijado por reglas anteriores):**

| Reporte | Cuentas incluidas | Excluye | Reembolsos | Frontera de fechas | Moneda | Agregación |
|---|---|---|---|---|---|---|
| Ingresos vs gastos | on-budget | transferencias, saldo inicial, ajustes de conciliación | netean el gasto de su categoría; ingreso solo si van a `inflow_rta` | `date` (DATE, tz del presupuesto), extremos inclusivos | moneda del presupuesto | Σ líneas (splits) |
| Gasto por categoría / comercio | on-budget | `inflow_rta`, pago de tarjeta, transferencias | netean | ídem | ídem | Σ actividad neta por `category_id` / `payee_id` |
| Patrimonio neto | on-budget + seguimiento | – | – | `as_of` (saldo a la fecha) | ídem | Σ activos − Σ pasivos |
| Flujo de caja | on-budget | – (separa transferencias y deuda) | netean en salidas | ídem | ídem | por grupo de BR-RPT-030 |
| Saldos de cuentas | todas | anuladas | – | `as_of` | ídem | `account_balances` (03.5.2) |
| Progreso de metas | on-budget | – | – | mes | ídem | `getGoalProgress` (Spec 06) |
| Edad del dinero | on-budget efectivo | transferencias | – | rango | ídem | BR-RPT-040 |

## 11.5 Modelo de datos

Los reportes **derivan** de `v_txn_lines` (04.5) y `account_balances` (03.5.2). Si hace falta rendimiento: vistas materializadas / tabla de refresco por job (A13.2), siempre invalidables y **no** fuente de verdad (A13.3). Edad del dinero: `income_lots` (`account_id, lot_date, amount_minor, remaining_minor`) como **cálculo analítico**, aislado del motor. RLS: `select` VIEWER (A8.3).

## 11.6 Backend

```ts
ReportService = {
  getIncomeVsExpense(); getSpendingByCategory(); getSpendingByPayee(); getNetWorth();
  getCashFlow(); getAccountBalances(); getGoalProgress(); getAgeOfMoney();
}
```
- Rutas: `GET /api/v1/budgets/:id/reports/spending` · `GET /api/v1/budgets/:id/reports/net-worth` (+ resto).
- **Exportación:** CSV de transacciones, categorías y cuentas (Fase 1). Celdas que empiezan con `=`, `+`, `-` o `@` se prefijan con `'` (**prevención de inyección de fórmulas**, bug #26). Fase 2: JSON completo y PDF.
- **JSON de exportación (versión 1):** `{ version:1, budget, members[], accounts[], categories[], transactions[], goals[], scheduledTransactions[], reconciliations[] }`.

## 11.7 UI

Primera capa **"Este mes"**: `Ingresos 5.000 · Gastos 3.700 · Neto 1.300`. Segunda capa: `Tendencia · Categorías · Comercios · Cuentas`. Filtros: cuenta, desde, hasta, confirmada/pendiente, comercio, categoría. Rutas en A9.2. Estados A9.3.

## 11.8 Casos borde

Transferencia con un lado conciliado · reembolso de un mes anterior · split con signos mixtos · cuenta cerrada con historial (sigue en reportes, 03.4) · categoría archivada (sufijo *"(archivada)"*, BR-CAT-020) · rango vacío · mes en curso parcial.

## 11.9 Criterios de aceptación

```text
AC-RPT-01  Given transferencia Corriente −500 / Ahorros +500
           Then Ingresos vs gastos no muestra Gasto 500 ni Ingreso 500.

AC-RPT-02  Given reembolso de Bs 100 en Compras
           Then el reporte de ingresos NO cambia y Compras neta −100 de gasto.

AC-RPT-03  Given una cuenta de seguimiento con Bs 12.000
           Then el patrimonio neto sube Bs 12.000 y Por asignar no cambia.

AC-RPT-04  Given un memo que empieza con "=" al exportar CSV
           Then la celda sale prefijada con ' .

AC-RPT-05  Given la edad del dinero calculada
           Then Por asignar es idéntico con y sin ese cálculo.
```

## 11.10 Tests requeridos

Unit por reporte con datasets dorados · property: `Σ gasto por categoría = Σ líneas de gasto` · integración: transferencias excluidas · E2E: "Este mes" y exportación.

## 11.12 No hacer

🟥 sumatorias complejas en React · 🟥 contar transferencias como ingreso/gasto · 🟥 tratar un reembolso como ingreso por defecto · 🟥 usar la edad del dinero para calcular Por asignar · 🟥 presentar *runway* como garantía · 🟥 exportar CSV sin neutralizar fórmulas.

---
