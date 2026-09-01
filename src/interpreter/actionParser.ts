import { pre } from "./utils.js";
import { Context, Severity, StateNode, Variable } from "./types.js";
import { sanitizeKeysAndExpr } from "./jsKeywords.js";
import {
  getLocalVariableMap,
  getVariable,
  getVariableType,
  setVariable,
} from "./variables.js";
import { raise } from "./errors.js";

function infixToAssignment(expr: string): string {
  // Turns something like A+=1 into A=A+1 for the eval() function
  return expr.replace(
    /([A-Za-z_]\w*(?:\[.*\])*)\s*([\+\-\*\/\%\&\|\^~\?]+)=\s*(.*)/,
    (match, variable: string, op: string, rhs: string) => {
      return `${variable} = ${variable} ${op} ${rhs}`;
    },
  );
}

function parseArrayRange(valueStr: string): string {
  let [start, end] = valueStr.replace("[", "").replace("]", "").split("to");
  const array = Array.from(
    { length: parseInt(end) - parseInt(start) + 1 },
    (_, i) => i + parseInt(start),
  );
  return JSON.stringify(array);
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
  const isArray = expression.includes("[") && expression.includes("]");

  if (isArray && expression.includes("to")) {
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
      const indicesStart = variable.indexOf("[");
      const varName = variable.substring(0, indicesStart).trim();
      const indicesStr = variable.substring(indicesStart).trim();

      if (!getVariableType(varName, node, context)!.includes("[]")) {
        throw new Error(`Variable ${varName} is not an array`);
      }

      const array = getVariable(varName.trim(), node, context);
      if (!Array.isArray(array))
        throw new Error(`Variable ${varName} is not defined`);

      const indices: string[] = [];

      let depth = 0;
      let indexStr = "";
      for (let i = 0; i < indicesStr.length; i++) {
        if (indicesStr[i] === "[") depth++;
        if (indicesStr[i] === "]") depth--;

        if (depth === 0) {
          indices.push(indexStr.trim());
          indexStr = "";
        } else if (indicesStr[i] !== "[" || depth > 1) {
          indexStr += indicesStr[i];
        }
      }

      const indicesNum = [];
      for (let i = 0; i < indices.length; i++) {
        indicesNum.push(parseExpression(indices[i], context, "int", node));
      }

      let target = array;
      for (let i = 0; i < indices.length - 1; i++) {
        target = target[indicesNum[i]];
      }

      target[indicesNum[indicesNum.length - 1]] = result;
    } else {
      if (getVariable(variable.trim(), node, context) === undefined) {
        raise(
          context,
          Severity.Error,
          `Variable ${variable.trim()} is not defined`,
        );
      }
      setVariable(variable.trim(), result, node, context);
    }
  }
}
