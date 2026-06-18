type Token =
  | { type: "VAR"; name: string }
  | { type: "AND" }
  | { type: "OR" }
  | { type: "NOT" }
  | { type: "LPAREN" }
  | { type: "RPAREN" };

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

  // NotExpr -> '!' NotExpr | Primary
  function parseNot(): boolean {
    const token = peek();
    if (token && token.type === "NOT") {
      consume();
      const value = parseNot();
      return !value;
    }
    return parsePrimary();
  }

  // Primary -> VAR | '(' OrExpr ')'
  function parsePrimary(): boolean {
    const token = consume();

    if (token.type === "VAR") {
      const raw = variables.get(token.name);
      return Boolean(raw);
    }

    if (token.type === "LPAREN") {
      const value = parseOr();
      const token = peek();
      if (!token || token.type !== "RPAREN") {
        throw new Error("Expected ')' in guard expression");
      }
      consume();
      return value;
    }

    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }

  const result = parseOr();

  if (pos < tokens.length) {
    throw new Error(
      `Unexpected token after end of expression: ${JSON.stringify(tokens[pos])}`,
    );
  }

  return result;
}
