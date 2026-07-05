type Token =
  | { type: "VAR"; name: string }
  | { type: "NUMBER"; value: number }
  | { type: "STRING"; value: string }
  | { type: "BOOL"; value: boolean }
  | { type: "EQ" }
  | { type: "SEMI" }
  | { type: "PLUS" }
  | { type: "MINUS" }
  | { type: "STAR" }
  | { type: "SLASH" }
  | { type: "PERCENT" }
  | { type: "INC" }
  | { type: "DEC" }
  | { type: "LPAREN" }
  | { type: "RPAREN" };

const compoundOps = new Map<string, string>([
  ["*=", "STAR"],
  ["/=", "SLASH"],
  ["+=", "PLUS"],
  ["-=", "MINUS"],
  ["%=", "PERCENT"],
]);

function tokenize(action: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < action.length) {
    const char = action[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
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

    // Compound assignments (*=, /=, +=, -=, %=)
    if (compoundOps.has(action.slice(i, i + 2))) {
      const op = action.slice(i, i + 2);
      tokens.push({ type: compoundOps.get(op)! as any });
      tokens.push({ type: "EQ" });
      i += 2;
      continue;
    }

    // Equals sign
    if (char === "=") {
      tokens.push({ type: "EQ" });
      i++;
      continue;
    }

    // Semicolon
    if (char === ";") {
      tokens.push({ type: "SEMI" });
      i++;
      continue;
    }

    // String literal (double quotes)
    if (char === '"') {
      let value = "";
      i++;
      while (i < action.length && action[i] !== '"') {
        value += action[i];
        i++;
      }
      i++;
      tokens.push({ type: "STRING", value });
      continue;
    }

    // String literal (single quotes)
    if (char === "'") {
      let value = "";
      i++;
      while (i < action.length && action[i] !== "'") {
        value += action[i];
        i++;
      }
      i++;
      tokens.push({ type: "STRING", value });
      continue;
    }

    // Postfix increment/decrement (++ and --) — must come before unary minus check
    if (char === "+" && i + 1 < action.length && action[i + 1] === "+") {
      tokens.push({ type: "INC" });
      i += 2;
      continue;
    }
    if (char === "-" && i + 1 < action.length && action[i + 1] === "-") {
      tokens.push({ type: "DEC" });
      i += 2;
      continue;
    }

    // Number literal or unary minus / binary minus
    if (char === "-" || /[0-9]/.test(char)) {
      let numStr = "";
      if (char === "-") {
        const prevToken = tokens[tokens.length - 1];
        const isUnary =
          !prevToken ||
          prevToken.type === "EQ" ||
          prevToken.type === "SEMI" ||
          prevToken.type === "PLUS" ||
          prevToken.type === "MINUS" ||
          prevToken.type === "STAR" ||
          prevToken.type === "SLASH" ||
          prevToken.type === "PERCENT" ||
          prevToken.type === "INC" ||
          prevToken.type === "DEC" ||
          prevToken.type === "LPAREN";

        if (isUnary && i + 1 < action.length && /[0-9]/.test(action[i + 1])) {
          numStr += char;
          i++;
        } else {
          tokens.push({ type: "MINUS" });
          continue;
        }
      }
      while (i < action.length && /[0-9]/.test(action[i])) {
        numStr += action[i];
        i++;
      }
      if (i < action.length && action[i] === ".") {
        numStr += ".";
        i++;
        while (i < action.length && /[0-9]/.test(action[i])) {
          numStr += action[i];
          i++;
        }
      }
      tokens.push({ type: "NUMBER", value: Number(numStr) });
      continue;
    }

    // Operators
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
    if (char === "/") {
      tokens.push({ type: "SLASH" });
      i++;
      continue;
    }
    if (char === "%") {
      tokens.push({ type: "PERCENT" });
      i++;
      continue;
    }

    // Boolean literal or variable name
    if (/[a-zA-Z]/.test(char)) {
      let name = "";
      while (i < action.length && /[a-zA-Z0-9_]/.test(action[i])) {
        name += action[i];
        i++;
      }

      if (name === "true") {
        tokens.push({ type: "BOOL", value: true });
      } else if (name === "false") {
        tokens.push({ type: "BOOL", value: false });
      } else {
        tokens.push({ type: "VAR", name });
      }
      continue;
    }

    throw new Error(`Unexpected character in action expression: '${char}'`);
  }

  return tokens;
}

// Postfix result: { value: expression result, lvar: variable name or null for mutation }
type Result = { value: unknown; lvar: string | null };

export function parseAction(
  action: string,
  variables: Map<string, unknown>,
): void {
  if (!action || action.trim() === "") {
    return;
  }

  const tokens = tokenize(action);
  let pos = 0;

  function peek(): Token | undefined {
    return tokens[pos];
  }

  function consume(): Token {
    const token = tokens[pos];
    if (!token) {
      throw new Error("Unexpected end of action expression");
    }
    pos++;
    return token;
  }

  // ActionExpr -> Stmt ( ';' Stmt )*
  function parseActionList() {
    parseStmt();
    while (peek()) {
      const token = peek();
      if (!token || token.type !== "SEMI") break;
      consume();
      parseStmt();
    }
  }

  // Stmt -> VAR CompoundOp ValueExpr | VAR '=' ValueExpr | VAR PostfixOps
  function parseStmt(): unknown {
    const leftToken = consume();
    if (leftToken.type !== "VAR") {
      throw new Error(
        `Expected variable name, got '${JSON.stringify(leftToken)}'`,
      );
    }

    // Check for compound assignment: VAR op= expr
    const firstPeek = peek();
    if (
      firstPeek &&
      isBinaryOp(firstPeek.type) &&
      pos + 1 < tokens.length &&
      tokens[pos + 1]?.type === "EQ"
    ) {
      consume(); // consume operator
      consume(); // consume '='
      const compoundOp = firstPeek.type;
      let currentValue = variables.get(leftToken.name);
      if (currentValue === undefined) {
        throw new Error(`Variable '${leftToken.name}' is not defined`);
      }
      if (typeof currentValue !== "number") {
        throw new Error(
          `Cannot apply operator to non-number variable '${leftToken.name}'`,
        );
      }

      const rhsValue = parseAdd();
      let newValue: number;
      switch (compoundOp) {
        case "STAR":
          newValue = (currentValue as number) * (rhsValue as number);
          break;
        case "SLASH":
          newValue = (currentValue as number) / (rhsValue as number);
          break;
        case "PLUS":
          newValue = (currentValue as number) + (rhsValue as number);
          break;
        case "MINUS":
          newValue = (currentValue as number) - (rhsValue as number);
          break;
        case "PERCENT":
          newValue = (currentValue as number) % (rhsValue as number);
          break;
        default:
          throw new Error(`Unknown compound operator '${compoundOp}'`);
      }

      variables.set(leftToken.name, newValue);
      return newValue;
    }

    // Check for regular assignment: VAR = expr
    if (firstPeek && firstPeek.type === "EQ") {
      consume(); // consume '='
      const value = parseAdd();
      variables.set(leftToken.name, value);
      return value;
    }

    // Standalone postfix: VAR ++ or VAR --
    const secondPeek = peek();
    if (secondPeek && secondPeek.type === "INC") {
      consume(); // consume INC
      let val = variables.get(leftToken.name);
      if (val === undefined) {
        throw new Error(`Variable '${leftToken.name}' is not defined`);
      }
      if (typeof val !== "number") {
        throw new Error(`Operator '++' requires a number, got '${typeof val}'`);
      }
      const newVal = (val as number) + 1;
      variables.set(leftToken.name, newVal);
      return newVal;
    }

    if (secondPeek && secondPeek.type === "DEC") {
      consume(); // consume DEC
      let val = variables.get(leftToken.name);
      if (val === undefined) {
        throw new Error(`Variable '${leftToken.name}' is not defined`);
      }
      if (typeof val !== "number") {
        throw new Error(`Operator '--' requires a number, got '${typeof val}'`);
      }
      const newVal = (val as number) - 1;
      variables.set(leftToken.name, newVal);
      return newVal;
    }

    throw new Error(
      `Expected '=', '+=', '-=', '*=', '/=', '%=', '++', or '--' after variable '${leftToken.name}'`,
    );
  }

  function isBinaryOp(t: string): boolean {
    return (
      t === "PLUS" ||
      t === "MINUS" ||
      t === "STAR" ||
      t === "SLASH" ||
      t === "PERCENT"
    );
  }

  // AddExpr -> MulExpr (('+' | '-') MulExpr)*
  function parseAdd(): unknown {
    let left = parseMul();

    while (peek() && (peek()!.type === "PLUS" || peek()!.type === "MINUS")) {
      const op = consume();
      const right = parseMul();

      if (op.type === "PLUS") {
        if (typeof left === "string" || typeof right === "string") {
          left = String(left) + String(right);
        } else {
          left = (left as number) + (right as number);
        }
      } else {
        if (typeof left !== "number" || typeof right !== "number") {
          throw new Error(
            `Operator '-' requires numbers, got '${typeof left}' and '${typeof right}'`,
          );
        }
        left = (left as number) - (right as number);
      }
    }

    return left;
  }

  // MulExpr -> Unary (('*' | '/' | '%') Unary)*
  function parseMul(): unknown {
    let left = parseUnary();

    while (
      peek() &&
      (peek()!.type === "STAR" ||
        peek()!.type === "SLASH" ||
        peek()!.type === "PERCENT")
    ) {
      const op = consume();
      const right = parseUnary();

      if (typeof left !== "number" || typeof right !== "number") {
        throw new Error(
          `Operator '${op.type.toLowerCase()}' requires numbers, got '${typeof left}' and '${typeof right}'`,
        );
      }

      switch (op.type) {
        case "STAR":
          left = (left as number) * (right as number);
          break;
        case "SLASH":
          left = (left as number) / (right as number);
          break;
        case "PERCENT":
          left = (left as number) % (right as number);
          break;
      }
    }

    return left;
  }

  // Unary -> ('-' | '+') Unary | PostfixExpr
  function parseUnary(): unknown {
    if (peek() && (peek()!.type === "PLUS" || peek()!.type === "MINUS")) {
      const op = consume();
      const operandVal = parseUnary();

      if (typeof operandVal !== "number") {
        throw new Error(
          `Operator '${op.type.toLowerCase()}' requires a number, got '${typeof operandVal}'`,
        );
      }

      return op.type === "MINUS"
        ? -(operandVal as number)
        : +(operandVal as number);
    }

    const result = parsePostfixExpr();
    return result.value;
  }

  // PostfixExpr -> Primary ('++' | '--')*
  function parsePostfixExpr(): Result {
    const primary = parsePrimary();
    let lvar = primary.lvar;

    if (lvar !== null && peek() && (peek()!.type === "INC" || peek()!.type === "DEC")) {
      if (typeof primary.value !== "number") {
        throw new Error("Postfix operators require a numeric expression");
      }
      let val = primary.value as number;
      let oldVal: number | undefined;

      while (peek() && (peek()!.type === "INC" || peek()!.type === "DEC")) {
        const incToken = consume();

        if (oldVal === undefined) {
          oldVal = val; // capture the original value for post- semantics
        }

        const newVal: number = incToken.type === "INC" ? val + 1 : val - 1;

        variables.set(lvar, newVal);
        val = newVal; // for chaining like X++++, continue from incremented value
      }

      return { value: oldVal ?? val, lvar: null };
    }

    return primary;
  }

  // Primary -> NUMBER | STRING | BOOL | '(' ValueExpr ')' | VAR
  function parsePrimary(): Result {
    const token = peek();
    if (!token) {
      throw new Error("Unexpected end of expression");
    }

    switch (token.type) {
      case "NUMBER":
        consume();
        return { value: token.value, lvar: null };

      case "STRING":
        consume();
        return { value: token.value, lvar: null };

      case "BOOL":
        consume();
        return { value: token.value, lvar: null };

      case "LPAREN":
        consume(); // consume '('
        const exprValue = parseAdd();
        const close = peek();
        if (!close || close.type !== "RPAREN") {
          throw new Error("Expected ')'");
        }
        consume(); // consume ')'
        return { value: exprValue, lvar: null };

      case "VAR":
        consume();
        const val = variables.get(token.name);
        if (val === undefined) {
          throw new Error(`Variable '${token.name}' is not defined`);
        }
        return { value: val, lvar: token.name }; // expose var name for potential postfix

      default:
        throw new Error(
          `Unexpected token in expression: '${JSON.stringify(token)}'`,
        );
    }
  }

  parseActionList();
}
