/**
 * Safe expression parser for CalcInput.
 * Implements Constitution P14 (no eval/Function allowed).
 * Parses basic math expressions string -> decimal Number.
 */

export function parseExpression(expr: string): number {
  if (!expr || expr.trim() === '') return 0;
  
  // Clean string and handle negative numbers properly at start or after operators
  const cleanedExpr = expr.replace(/\s+/g, '').replace(/,/g, '.');
  
  // Very basic tokenization
  const tokens = cleanedExpr.match(/(?:\d+\.\d+|\d+|\+|\-|\*|\/|\(|\))/g);
  if (!tokens) throw new Error("Invalid expression");

  // Shunting yard to postfix
  const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const output: (number|string)[] = [];
  const operators: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Handle unary minus (e.g., "-5" or "(-5)")
    if (token === '-' && (i === 0 || ['+', '-', '*', '/', '('].includes(tokens[i - 1]))) {
      // It's a unary minus, treat the next number as negative
      if (i + 1 < tokens.length && !isNaN(Number(tokens[i + 1]))) {
        output.push(-Number(tokens[i + 1]));
        i++; // skip next token
        continue;
      }
    }

    if (!isNaN(Number(token))) {
      output.push(Number(token));
    } else if (['+', '-', '*', '/'].includes(token)) {
      while (operators.length > 0) {
        const top = operators[operators.length - 1];
        if (top !== '(' && precedence[top] >= precedence[token]) {
          output.push(operators.pop()!);
        } else {
          break;
        }
      }
      operators.push(token);
    } else if (token === '(') {
      operators.push(token);
    } else if (token === ')') {
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        output.push(operators.pop()!);
      }
      if (operators.length > 0 && operators[operators.length - 1] === '(') {
        operators.pop();
      }
    }
  }
  
  while (operators.length > 0) {
    output.push(operators.pop()!);
  }

  // Evaluate postfix
  const stack: number[] = [];
  for (const token of output) {
    if (typeof token === 'number') {
      stack.push(token);
    } else {
      const b = stack.pop()!;
      const a = stack.pop() || 0;
      switch (token) {
        case '+': stack.push(a + b); break;
        case '-': stack.push(a - b); break;
        case '*': stack.push(a * b); break;
        case '/': stack.push(a / b); break;
      }
    }
  }

  if (stack.length !== 1) throw new Error("Invalid expression");
  return stack[0];
}

/**
 * Parses an expression and safely converts it to minor units based on currency precision.
 * E.g., "10 + 5" with precision 2 -> 1500n
 */
export function evaluateToMinor(expr: string, precision: number = 2): bigint {
  try {
    const result = parseExpression(expr);
    const multiplier = Math.pow(10, precision);
    return BigInt(Math.round(result * multiplier));
  } catch (error) {
    return 0n; // Fallback for invalid inputs, UI will handle error state
  }
}
