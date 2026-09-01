import { pre } from "./utils.js";
import { Context, StateNode, Variable } from "./types.js";
import { sanitizeKeysAndExpr } from "./jsKeywords.js";
import {
  getLocalVariableMap,
  getVariable,
  getVariableType,
  parseArrayRange,
  setVariable,
} from "./variables.js";

function infixToAssignment(expr: string): string {
  // Turns something like A+=1 into A=A+1 for the eval() function
  return expr.replace(
    /([A-Za-z_]\w*(?:\[[^\]]*\])*)\s*([\+\-\*\/\%\&\|\^~\?]+)=\s*(.*)/,
    (match, variable: string, op: string, rhs: string) => {
      return `${variable} = ${variable} ${op} ${rhs}`;
    },
  );
}

export function parseExpression(
  expression: string,
  context: Context,
  varType: string,
  node: StateNode,
): any {
  const localVarMap = getLocalVariableMap(context, node);
  const keys = Array.from(localVarMap.keys());
  const values = Array.from(localVarMap.values());

  const specialFns: Record<string, (arg: string) => unknown> = {
    pre: (v: string) => pre(context, v, node),
    // future: prev: (v) => ..., changed: (v) => ...
  };

  let placeholderIdx = 0;
  const replacers: Record<string, string> = {};

  for (const [name, fn] of Object.entries(specialFns)) {
    const pattern = new RegExp(`\\b${name}\\s*\\(\\s*([^)]+)\\s*\\)`, "g");

    let match;
    while ((match = pattern.exec(expression)) !== null) {
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
      expression = expression.replace(match[0], placeholder);
      placeholderIdx++;
    }
  }

  for (const [placeholder, replacement] of Object.entries(replacers)) {
    expression = expression.replaceAll(placeholder, replacement);
  }

  expression = expression.replaceAll("{", "[").replaceAll("}", "]");

  if (
    expression.includes("[") &&
    expression.includes("]") &&
    expression.includes("to")
  ) {
    expression = parseArrayRange(expression);
  }

  const { safeKeys, safeExpr } = sanitizeKeysAndExpr(keys, expression);
  const fn = new Function(...safeKeys, `return (${safeExpr})`);
  let result = fn(...values);

  // This is here because sometimes the models in the test suite use | instead of || and js says false | false = 0
  if (varType == "bool") {
    if (result === 0) result = false;
    else if (result === 1) result = true;
  }

  return result;
}

export function parseAction(
  action: string,
  context: Context,
  node: StateNode,
): void {
  if (!action || action.trim() === "") return;

  const actions = action.split(";");
  for (let part of actions) {
    part = part.replaceAll("++", "+=1").replaceAll("--", "-=1");
    part = infixToAssignment(part);

    let [variable, expression] = part.split("=")!;
    const result = parseExpression(
      expression,
      context,
      getVariableType(variable, node, context)!,
      node,
    );

    if (variable.includes("[") && variable.includes("]")) {
      const [varName, ...indicesStr] = variable.trim().split("[");

      if (!getVariableType(varName, node, context)!.includes("[]")) {
        throw new Error(`Variable ${varName} is not an array`);
      }

      // const array = context.variables.get(varName)?.value;
      const array = getVariable(varName.trim(), node, context);
      if (!Array.isArray(array))
        throw new Error(`Variable ${varName} is not defined`);

      const indices: number[] = [];

      for (let strIndex of indicesStr) {
        strIndex = strIndex.replace("]", "");

        if (!isNaN(Number(strIndex))) {
          indices.push(Number(strIndex));
        } else if (!isNaN(Number(getVariable(strIndex, node, context)))) {
          indices.push(Number(getVariable(strIndex, node, context)));
        } else {
          throw new Error(`Invalid index ${strIndex}`);
        }
      }

      indicesStr.map((i) => Number(i.replace("]", "")));

      let target = array;
      for (let i = 0; i < indices.length - 1; i++) {
        target = target[indices[i]];
      }
      target[indices[indices.length - 1]] = result;
    } else {
      setVariable(variable.trim(), result, node, context);
      // context.variables.get(variable.trim())!.value = result;
    }
  }
}
