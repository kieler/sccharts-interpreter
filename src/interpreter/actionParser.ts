import { pre } from "./utils.js";
import { Context } from "./types.js";
import { sanitizeKeysAndExpr } from "./jsKeywords.js";

function infixToAssignment(expr: string): string {
  // Turns something like A+=1 into A=A+1 for the eval() function
  // TODO: regex for arrays, should look something like this:
  return expr.replace(
    /([A-Za-z_]\w*(?:\[[^\]]*\])*)\s*([\+\-\*\/\%\&\|\^~\?]+)=\s*(.*)/,
    (match, variable: string, op: string, rhs: string) => {
      // const baseOp = op.slice(0, -1); // strip '='
      return `${variable}=${variable}${op} ${rhs}`;
    },
  );
}

export function parseAction(action: string, context: Context): void {
  if (!action || action.trim() === "") return;

  const keys = Array.from(context.variables.keys());
  const values = Array.from(context.variables.values());

  const specialFns: Record<string, (arg: string) => unknown> = {
    pre: (v: string) => pre(context, v),
    // future: prev: (v) => ..., changed: (v) => ...
  };

  // Walk the expression and replace special function calls with placeholders
  let placeholderIdx = 0;
  const replacers: Record<string, string> = {};

  for (const [name, fn] of Object.entries(specialFns)) {
    const pattern = new RegExp(`\\b${name}\\s*\\(\\s*([^)]+)\\s*\\)`, "g");

    let match;
    while ((match = pattern.exec(action)) !== null) {
      const argRaw = match[1].trim(); // e.g. "a" or "'a'"
      let resolvedArg: string = argRaw;

      if (resolvedArg.startsWith("'") && resolvedArg.endsWith("'")) {
        resolvedArg = resolvedArg.slice(1, -1);
      } else if (resolvedArg.startsWith('"') && resolvedArg.endsWith('"')) {
        resolvedArg = resolvedArg.slice(1, -1);
      }

      const result = fn(resolvedArg);

      const placeholder = `__REPL_${placeholderIdx}__`;
      replacers[placeholder] = String(result);
      action = action.replace(match[0], placeholder);
      placeholderIdx++;
    }
  }

  const actions = action.split(";");
  for (let part of actions) {
    part = part.replaceAll("++", "+=1").replaceAll("--", "-=1");
    part = infixToAssignment(part);

    for (const [placeholder, replacement] of Object.entries(replacers)) {
      part = part.replaceAll(placeholder, replacement);
    }

    const [variable, expression] = part.split("=")!;
    const { safeKeys, safeExpr } = sanitizeKeysAndExpr(keys, expression);
    const fn = new Function(...safeKeys, `return (${safeExpr})`);
    let result = fn(...values);

    // This is here because sometimes the models in the test suite use | instead of || and js says false | false = 0
    if (context.variableTypes.get(variable.trim()) == "bool") {
      if (result === 0) result = false;
      else if (result === 1) result = true;
    }

    context.variables.set(variable.trim(), result);
  }
}
