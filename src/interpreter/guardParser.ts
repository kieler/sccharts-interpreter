type Token =
  | { type: "VAR"; name: string }
  | { type: "NUMBER"; value: number }
  | { type: "AND" }
  | { type: "OR" }
  | { type: "NOT" }
  | { type: "LPAREN" }
  | { type: "RPAREN" }
  | { type: "GT" }
  | { type: "LT" }
  | { type: "GE" }
  | { type: "LE" }
  | { type: "EQ" }
  | { type: "NEQ" }
  | { type: "PLUS" }
  | { type: "MINUS" }
  | { type: "STAR" }
  | { type: "SLASH" };

function tokenize(guard: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < guard.length) {
    const char = guard[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Two-character operators
    if (i + 1 < guard.length) {
      const two = guard.slice(i, i + 2);
      if (two === "&&") {
        tokens.push({ type: "AND" });
        i += 2;
        continue;
      }
      if (two === "||") {
        tokens.push({ type: "OR" });
        i += 2;
        continue;
      }
      if (two === ">=") {
        tokens.push({ type: "GE" });
        i += 2;
        continue;
      }
      if (two === "<=") {
        tokens.push({ type: "LE" });
        i += 2;
        continue;
      }
      if (two === "==") {
        tokens.push({ type: "EQ" });
        i += 2;
        continue;
      }
      if (two === "!=") {
        tokens.push({ type: "NEQ" });
        i += 2;
        continue;
      }
    }

    // Parentheses
    if (char === "(") {
      tokens.push({ type: "LPAREN" });
      i++;
      continue;
    }
    if (char === ")") {
      tokens.push({ type: "RPAREN" });
      i++;
      continue;
    }

    // NOT operator - single ! character
    if (char === "!") {
      tokens.push({ type: "NOT" });
      i++;
      continue;
    }

    // Comparison operators > and < (check before `-` to handle `>=`, `<=`)
    if (char === ">") {
      tokens.push({ type: "GT" });
      i++;
      continue;
    }
    if (char === "<") {
      tokens.push({ type: "LT" });
      i++;
      continue;
    }

    // Number literal or unary/binary minus
    if (char === "-" || /[0-9]/.test(char)) {
      let numStr = "";
      if (char === "-") {
        const prevToken = tokens[tokens.length - 1];
        const isUnary =
          !prevToken ||
          prevToken.type === "LPAREN" ||
          prevToken.type === "AND" ||
          prevToken.type === "OR" ||
          prevToken.type === "NOT" ||
          prevToken.type === "GT" ||
          prevToken.type === "LT" ||
          prevToken.type === "GE" ||
          prevToken.type === "LE" ||
          prevToken.type === "EQ" ||
          prevToken.type === "NEQ";
        if (isUnary && i + 1 < guard.length && /[0-9]/.test(guard[i + 1])) {
          numStr += char;
          i++;
        } else {
          tokens.push({ type: "MINUS" });
          continue;
        }
      }
      while (i < guard.length && /[0-9]/.test(guard[i])) {
        numStr += guard[i];
        i++;
      }
      if (i < guard.length && guard[i] === ".") {
        numStr += ".";
        i++;
        while (i < guard.length && /[0-9]/.test(guard[i])) {
          numStr += guard[i];
          i++;
        }
      }
      tokens.push({ type: "NUMBER", value: Number(numStr) });
      continue;
    }

    // Operators + and * (must come after number check to avoid conflict with `-`)
    if (char === "+") {
      tokens.push({ type: "PLUS" });
      i++;
      continue;
    }
    if (char === "*") {
      tokens.push({ type: "STAR" });
      i++;
      continue;
    }

    // Variable / identifier - starts with a letter or underscore
    if (/[a-zA-Z_]/.test(char)) {
      let name = "";
      while (i < guard.length && /[a-zA-Z0-9_]/.test(guard[i])) {
        name += guard[i];
        i++;
      }
      tokens.push({ type: "VAR", name });
      continue;
    }

    throw new Error(`Unexpected character in guard expression: '${char}'`);
  }

  return tokens;
}

// Returns a numeric value from a variable, coercing types as needed.
function varToNum(name: string, variables: Map<string, unknown>): number {
  const raw = variables.get(name);
  if (raw === undefined || raw === null) {
    return 0;
  }
  if (typeof raw === "boolean") {
    return raw ? 1 : 0;
  }
  if (typeof raw === "number") {
    return raw;
  }
  const parsed = parseFloat(String(raw));
  return isNaN(parsed) ? 0 : parsed;
}

export function parseGuard(
  guard: string,
  variables: Map<string, unknown>,
): boolean {
  if (!guard || guard.trim() === "") {
    return true;
  }

  const tokens = tokenize(guard);
  let pos = 0;

  function peek(): Token | undefined {
    return tokens[pos];
  }

  function consume(): Token {
    const token = tokens[pos];
    if (!token) {
      throw new Error("Unexpected end of guard expression");
    }
    pos++;
    return token;
  }

  // OrExpr -> AndExpr ( '||' AndExpr )*
  function parseOr(): boolean {
    let left = parseAnd();
    while (true) {
      const token = peek();
      if (!token || token.type !== "OR") break;
      consume();
      const right = parseAnd();
      left = left || right;
    }
    return left;
  }

  // AndExpr -> NotExpr ( '&&' NotExpr )*
  function parseAnd(): boolean {
    let left = parseNot();
    while (true) {
      const token = peek();
      if (!token || token.type !== "AND") break;
      consume();
      const right = parseNot();
      left = left && right;
    }
    return left;
  }

  // NotExpr -> '!' NotExpr | Comparison
  function parseNot(): boolean {
    const token = peek();
    if (token && token.type === "NOT") {
      consume();
      const value = parseNot();
      return !value;
    }
    return parseComparison();
  }

  // Comparison -> AddExpr (comp_op AddExpr)*
  function parseComparison(): boolean {
    let left = parseAdd();

    while (true) {
      const token = peek();
      if (!token || !isCompOp(token.type)) break;
      consume();
      const right = parseAdd();

      switch (token.type) {
        case "GT":
          return left > right;
        case "LT":
          return left < right;
        case "GE":
          return left >= right;
        case "LE":
          return left <= right;
        case "EQ":
          return left === right;
        case "NEQ":
          return left !== right;
      }
    }

    // No comparison operator — coerce numeric result to boolean (truthiness)
    return Boolean(left);
  }

  function isCompOp(t: string): boolean {
    return (
      t === "GT" ||
      t === "LT" ||
      t === "GE" ||
      t === "LE" ||
      t === "EQ" ||
      t === "NEQ"
    );
  }

  // AddExpr -> MulExpr (('+' | '-') MulExpr)*
  function parseAdd(): number {
    let left = parseMul();

    while (peek() && (peek()!.type === "PLUS" || peek()!.type === "MINUS")) {
      const op = consume();
      const right = parseMul();
      if (op.type === "PLUS") {
        left = left + right;
      } else {
        left = left - right;
      }
    }

    return left;
  }

  // MulExpr -> Unary (('*' | '/') Unary)*
  function parseMul(): number {
    let left = parseUnary();

    while (peek() && (peek()!.type === "STAR" || peek()!.type === "SLASH")) {
      const op = consume();
      const right = parseUnary();
      if (op.type === "STAR") {
        left = left * right;
      } else {
        left = left / right;
      }
    }

    return left;
  }

  // Unary -> '-' Unary | Primary
  function parseUnary(): number {
    if (peek() && peek()!.type === "MINUS") {
      consume();
      const operand = parseUnary();
      return -operand;
    }
    return parsePrimary();
  }

  // Primary -> VAR | NUMBER | '(' GuardExpr ')'
  function parsePrimary(): number {
    const token = consume();

    if (token.type === "VAR") {
      return varToNum(token.name, variables);
    }

    if (token.type === "NUMBER") {
      return token.value;
    }

    if (token.type === "LPAREN") {
      const value = parseOr();
      const close = peek();
      if (!close || close.type !== "RPAREN") {
        throw new Error("Expected ')' in guard expression");
      }
      consume();
      return Number(value);
    }

    // For boolean/logical tokens, coerce to number (AND=1, OR=1)
    if (token.type === "AND" || token.type === "OR") {
      return 1;
    }

    throw new Error(
      `Unexpected token in guard expression: ${JSON.stringify(token)}`,
    );
  }

  // Parse the full guard starting from OR expression level
  const result = parseOr();
  return result;
}
