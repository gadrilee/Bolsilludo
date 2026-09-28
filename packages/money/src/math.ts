/**
 * Core integer money math for Bolsilludo.
 * Implements Constitution P2: All amounts must be in minor units.
 */

export function add(a: bigint, b: bigint): bigint {
  return a + b;
}

export function subtract(a: bigint, b: bigint): bigint {
  return a - b;
}

/**
 * Multiplies an integer minor amount by a decimal multiplier (e.g. for FX or percentages).
 * Uses half-even/standard rounding internally before casting back to bigint.
 */
export function multiply(a: bigint, multiplier: number): bigint {
  return BigInt(Math.round(Number(a) * multiplier));
}

/**
 * Distributes an amount into `parts` as evenly as possible.
 * The remainder is distributed 1 unit at a time to the first lines.
 * This satisfies the deterministic rounding policy.
 */
export function distribute(amount: bigint, parts: number): bigint[] {
  if (parts <= 0) throw new Error("Parts must be greater than 0");
  
  const base = amount / BigInt(parts);
  let remainder = Number(amount % BigInt(parts));
  
  const result = new Array(parts).fill(base);
  
  let i = 0;
  while (remainder > 0) {
    result[i] += 1n;
    remainder--;
    i++;
  }
  while (remainder < 0) {
    result[i] -= 1n;
    remainder++;
    i++;
  }
  
  return result;
}
