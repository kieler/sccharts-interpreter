import { raise } from "./errors.js";
import { sanitizeKeysAndExpr } from "./jsKeywords.js";
import { Context, Severity, StateNode } from "./types.js";
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

  const possibleFunction = context.functionCache.get(node.id + guard);
  if (possibleFunction != undefined) {
    return possibleFunction(...values);
  }

  const { safeKeys, safeExpr } = sanitizeKeysAndExpr(keys, guard);

  try {
    const fn = new Function(...safeKeys, `return (${safeExpr})`);
    context.functionCache.set(node.id + guard, fn);
    return fn(...values);
  } catch (e) {
    raise(
      context,
      Severity.Error,
      `Failed to parse guard: ${guard} at node ${node.id}, Error: ${e}`,
    );
    return false;
  }
}
