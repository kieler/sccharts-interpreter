const KEYWORDS = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "await",
]);

export function isKeyword(name: string): boolean {
  return KEYWORDS.has(name);
}

export function sanitizeKeysAndExpr(
  keys: string[],
  expr: string,
): { safeKeys: string[]; safeExpr: string } {
  const renames = new Map<string, string>();

  for (const key of keys) {
    if (isKeyword(key)) {
      renames.set(key, `_${key}`);
    }
  }

  if (renames.size === 0) return { safeKeys: [...keys], safeExpr: expr };

  let safeExpr = expr;
  for (const [original, renamed] of renames) {
    const regex = new RegExp(`\\b${original}\\b`, "g");
    safeExpr = safeExpr.replace(regex, renamed);
  }

  const safeKeys = keys.map((k) => renames.get(k) ?? k);
  return { safeKeys, safeExpr };
}
