import { sanitizeKeysAndExpr } from "./jsKeywords.js";
import { Variable } from "./types.js";

export function parseGuard(
  guard: string,
  variables: Map<string, unknown>,
): boolean {
  if (!guard || guard.trim() === "") return true;

  const keys = Array.from(variables.keys());
  var values: Variable[] = Array.from(variables.values()) as Variable[];
  values = values.map((v) => v.value);

  const { safeKeys, safeExpr } = sanitizeKeysAndExpr(keys, guard);

  const fn = new Function(...safeKeys, `return (${safeExpr})`);
  return fn(...values);
}
