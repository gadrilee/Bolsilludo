import { describe, it, expect } from 'vitest';
import { evaluateToMinor, parseExpression } from '../src/parser';

describe('CalcInput Parser', () => {
  it('parses simple numbers', () => {
    expect(parseExpression('10')).toBe(10);
    expect(parseExpression('10.50')).toBe(10.5);
  });

  it('evaluates basic math', () => {
    expect(parseExpression('10 + 5')).toBe(15);
    expect(parseExpression('10 - 2')).toBe(8);
    expect(parseExpression('4 * 5')).toBe(20);
    expect(parseExpression('20 / 4')).toBe(5);
  });

  it('respects operator precedence', () => {
    expect(parseExpression('10 + 5 * 2')).toBe(20);
    expect(parseExpression('10 + 5 * 2 - 4 / 2')).toBe(18);
  });

  it('handles parentheses', () => {
    expect(parseExpression('(10 + 5) * 2')).toBe(30);
    expect(parseExpression('10 + (5 * 2)')).toBe(20);
  });

  it('handles unary minus', () => {
    expect(parseExpression('-10 + 5')).toBe(-5);
    expect(parseExpression('5 + (-10)')).toBe(-5);
  });

  it('evaluates to minor units based on precision', () => {
    // USD (precision 2) -> multiply by 100
    expect(evaluateToMinor('10.25', 2)).toBe(1025n);
    expect(evaluateToMinor('10 + 5 * 2', 2)).toBe(2000n);
    
    // BHD (precision 3) -> multiply by 1000
    expect(evaluateToMinor('10.25', 3)).toBe(10250n);
    
    // JPY (precision 0) -> multiply by 1
    expect(evaluateToMinor('500', 0)).toBe(500n);
  });

  it('returns 0n for completely invalid expressions', () => {
    expect(evaluateToMinor('hello', 2)).toBe(0n);
  });
});
