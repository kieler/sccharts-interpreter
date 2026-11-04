import { raise } from "./errors.js";
import { Context, Severity, StateNode } from "./types.js";
import { parseExpression } from "./actionParser.js";

/**
 * Evaluate a guard expression and return a boolean result.
 */
export function parseGuard(
  guard: string,
  context: Context,
  node: StateNode,
): boolean {
  if (!guard || guard.trim() === "") return true;

  try {
    const result = parseExpression(guard, context, "bool", node);
    // Guards always expect boolean; coerce numeric results.
    if (result === 0 || result === false || result == null) return false;
    return true;
  } catch (e) {
    raise(
      context,
      Severity.Error,
      `Failed to parse guard: ${guard} at node ${node.id}, Error: ${e}`,
    );
    return false;
  }
}
