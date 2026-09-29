// budget-engine/src/credit-card.ts
// Pure functions for credit card mechanics — BR-CC-010 through BR-CC-060
// BR-CC-070: NO UI calculations; this module is the sole source of truth.

export type Money = bigint;

export type CreditCardStatus =
  | 'FUNDED'
  | 'PAYMENT_UNDERFUNDED'
  | 'PAYMENT_OVERSHOOT'
  | 'POSITIVE_CREDIT_BALANCE';

export type CreditCardInspector = {
  purchases: Money;       // Sum of negative card transactions (spending)
  refunds: Money;         // Sum of positive card transactions (refunds)
  payments: Money;        // Sum of transfers TO the card (debt reduction)
  creditOverspending: Money; // Spending beyond available category funds
  cashOverspending: Money;   // Direct cash overdraft (not card-related)
};

export type CreditCardStatusDTO = {
  accountId: string;
  workingBalance: Money;          // Current card balance (negative = debt)
  paymentAvailable: Money;        // Funds reserved to pay the card
  coveragePct: number;            // paymentAvailable / |workingBalance| * 100
  status: CreditCardStatus;
  underfundedAmount: Money;       // How much more is needed to cover debt
  floatRisk: boolean;             // BR-CC-040
  inspector: CreditCardInspector;
  explanation: { label: string; amount: Money }[];
};

// ─── BR-CC-010: Funded Purchase ─────────────────────────────────────────────
// A card purchase moves money from the spending category TO the payment category.
// "Por asignar" (RTA) is NOT affected.
export function computeFundedPurchase(
  categoryAvailable: Money,
  purchaseAmount: Money, // positive value representing the purchase cost
): { newCategoryAvailable: Money; paymentReserved: Money; creditOverspent: Money } {
  const funded = categoryAvailable >= purchaseAmount ? purchaseAmount : categoryAvailable > 0n ? categoryAvailable : 0n;
  const creditOverspent = purchaseAmount - funded;
  return {
    newCategoryAvailable: categoryAvailable - funded,
    paymentReserved: funded,
    creditOverspent,
  };
}

// ─── BR-CC-020: Payment ──────────────────────────────────────────────────────
// A payment is a transfer TO the card. It reduces paymentAvailable.
// Returns the new paymentAvailable after the payment.
export function computePayment(
  paymentAvailable: Money,
  paymentAmount: Money, // positive value
): { newPaymentAvailable: Money; status: 'OK' | 'OVERSHOOT' } {
  const newPaymentAvailable = paymentAvailable - paymentAmount;
  return {
    newPaymentAvailable,
    status: newPaymentAvailable < 0n ? 'OVERSHOOT' : 'OK',
  };
}

// ─── Status Calculator (BR-CC-021/022/050) ───────────────────────────────────
export function computeCreditCardStatus(
  accountId: string,
  workingBalance: Money,   // Current card balance (negative = debt owed)
  paymentAvailable: Money, // Funds reserved in payment category
  inspector: CreditCardInspector,
  recentMonthsUnderfunded: boolean = false, // For float risk detection
): CreditCardStatusDTO {
  const debt = workingBalance < 0n ? -workingBalance : 0n;
  const coveragePct = debt === 0n
    ? 100
    : Number((paymentAvailable * 10000n) / debt) / 100;

  // BR-CC-050: Positive balance (overpayment)
  if (workingBalance > 0n) {
    return {
      accountId,
      workingBalance,
      paymentAvailable,
      coveragePct: 100,
      status: 'POSITIVE_CREDIT_BALANCE',
      underfundedAmount: 0n,
      floatRisk: false,
      inspector,
      explanation: [
        { label: 'Saldo a favor (sobrepago)', amount: workingBalance },
      ],
    };
  }

  // BR-CC-022: Overshoot — paid more than available
  if (paymentAvailable < 0n) {
    return {
      accountId,
      workingBalance,
      paymentAvailable,
      coveragePct,
      status: 'PAYMENT_OVERSHOOT',
      underfundedAmount: -paymentAvailable, // How much was overpaid
      floatRisk: false,
      inspector,
      explanation: [
        { label: 'Pago disponible', amount: paymentAvailable },
        { label: 'Sobrepago (saldo en rojo)', amount: -paymentAvailable },
      ],
    };
  }

  const underfundedAmount = debt > paymentAvailable ? debt - paymentAvailable : 0n;

  // BR-CC-040: Float risk — payment available < debt AND pattern suggests future income dependency
  const floatRisk = paymentAvailable < debt && recentMonthsUnderfunded;

  // BR-CC-021: Underfunded
  if (underfundedAmount > 0n) {
    return {
      accountId,
      workingBalance,
      paymentAvailable,
      coveragePct,
      status: 'PAYMENT_UNDERFUNDED',
      underfundedAmount,
      floatRisk,
      inspector,
      explanation: [
        { label: 'Deuda de tarjeta', amount: debt },
        { label: 'Pago reservado', amount: paymentAvailable },
        { label: 'Falta cubrir', amount: underfundedAmount },
        ...(floatRisk ? [{ label: '⚠ Posible float de tarjeta', amount: 0n }] : []),
      ],
    };
  }

  // Fully funded
  return {
    accountId,
    workingBalance,
    paymentAvailable,
    coveragePct,
    status: 'FUNDED',
    underfundedAmount: 0n,
    floatRisk,
    inspector,
    explanation: [
      { label: 'Deuda de tarjeta', amount: debt },
      { label: 'Pago reservado', amount: paymentAvailable },
      { label: 'Cobertura', amount: paymentAvailable },
    ],
  };
}

// ─── BR-CC-030: Funded distribution across cards ─────────────────────────────
// Splits the funded amount of a shared category proportionally across cards.
// Remainder goes to the LAST card in stable order (position, id).
export function distributeFundedByCard(
  totalFunded: Money,
  cards: { accountId: string; creditNet: Money }[], // creditNet = spending on this card
): { accountId: string; funded: Money }[] {
  const totalCreditNet = cards.reduce((sum, c) => sum + c.creditNet, 0n);
  if (totalCreditNet === 0n) return cards.map(c => ({ accountId: c.accountId, funded: 0n }));

  const result: { accountId: string; funded: Money }[] = [];
  let distributed = 0n;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (i === cards.length - 1) {
      // Last card gets the remainder (floor rounding per §140)
      result.push({ accountId: card.accountId, funded: totalFunded - distributed });
    } else {
      const share = (totalFunded * card.creditNet) / totalCreditNet;
      result.push({ accountId: card.accountId, funded: share });
      distributed += share;
    }
  }

  return result;
}
