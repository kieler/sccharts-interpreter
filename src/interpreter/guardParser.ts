import { sanitizeKeysAndExpr } from "./jsKeywords.js";
import { Context, StateNode, Variable } from "./types.js";
import { getLocalVariableMap } from "./variables.js";

export function parseGuard(
  guard: string,
  context: Context,
  node: StateNode,
): boolean {
  if (!guard || guard.trim() === "") return true;

  const localVarMap = getLocalVariableMap(context, node);
  const keys = Array.from(localVarMap.keys());
  const values = Array.from(localVarMap.values());

  const { safeKeys, safeExpr } = sanitizeKeysAndExpr(keys, guard);

  const fn = new Function(...safeKeys, `return (${safeExpr})`);
  return fn(...values);
}
