import { sanitizeKeysAndExpr } from "./jsKeywords.js";

export function parseGuard(
  guard: string,
  variables: Map<string, unknown>,
): boolean {
  if (!guard || guard.trim() === "") return true;

  const keys = Array.from(variables.keys());
  const values = Array.from(variables.values());

  const { safeKeys, safeExpr } = sanitizeKeysAndExpr(keys, guard);

  const fn = new Function(...safeKeys, `return (${safeExpr})`);
  return fn(...values);
}
