import { parseExpression } from "./actionParser.js";
import { Context, StateNode, Variable } from "./types.js";
import { getScope, getVariableScope } from "./utils.js";

function findBestMatch(possibleVars: Variable[], scope: string): Variable {
  const matchingScopes: Variable[] = [];
  for (const variable of possibleVars) {
    if (scope.includes(variable.scope)) {
      matchingScopes.push(variable);
    }
  }

  return matchingScopes.sort((a, b) => b.scope.length - a.scope.length)[0];
}

function __getVariable(
  id: string,
  node: StateNode,
  context: Context,
): Variable | undefined {
  const possibleVars = context.variables.get(id.trim());
  if (!possibleVars) return undefined;

  if (Array.isArray(possibleVars)) {
    const scope = getScope(node.graph);
    return findBestMatch(possibleVars, scope);
  }

  return possibleVars;
}

export function getVariable(
  id: string,
  node: StateNode,
  context: Context,
): any | undefined {
  const variable = __getVariable(id, node, context);
  if (!variable) return undefined;
  return variable.value;
}

export function getVariablePre(
  id: string,
  node: StateNode,
  context: Context,
): any | undefined {
  const variable = __getVariable(id, node, context);
  if (!variable) return undefined;
  return variable.preValue;
}

export function getVariableType(
  id: string,
  node: StateNode,
  context: Context,
): string | undefined {
  const variable = __getVariable(id, node, context);
  if (!variable) return undefined;
  return variable.type;
}

export function setVariable(
  id: string,
  value: any,
  node: StateNode,
  context: Context,
): void {
  const possibleVars = context.variables.get(id);
  if (!possibleVars) return;

  if (Array.isArray(possibleVars)) {
    const scope = getVariableScope(node);
    const bestMatch = findBestMatch(possibleVars, scope);
    bestMatch.value = value;
    return;
  }

  possibleVars.value = value;
}

function parseScalar(
  value: any,
  type: string,
  context: Context,
  node: StateNode,
): unknown {
  const parsed_value = parseExpression(value, context, type, node);
  return parsed_value;
}

function parseArrayValues(valueStr: string): unknown[] {
  valueStr = valueStr.replaceAll("{", "[").replaceAll("}", "]");

  return eval(valueStr);
}

function initialArrayValues(
  cardinalities: number[],
  defaultValue: unknown,
): unknown[] {
  if (cardinalities.length == 0) {
    return [];
  }

  const [size, ...rest] = cardinalities;
  const array: any[] = [];

  for (let i = 0; i < size; i++) {
    if (rest.length == 0) {
      array.push(defaultValue);
    } else {
      array.push(initialArrayValues(rest, defaultValue));
    }
  }

  return array;
}

export function createVariable(
  context: Context,
  id: string,
  node: StateNode,
  type: string,
  value: any | undefined = undefined,
  cardinalities: number[] = [],
): void {
  const defaultValues: Record<string, unknown> = {
    int: 0,
    bool: false,
    string: null,
    float: 0.0,
  };

  const isArray = cardinalities.length > 0;

  if (!value) {
    if (isArray) {
      value = initialArrayValues(cardinalities, defaultValues[type]);
    } else {
      value = defaultValues[type];
    }
  } else {
    if (isArray) {
      value = parseArrayValues(value);
    } else {
      value = parseScalar(value, type, context, node);
    }
  }

  const variable: Variable = {
    id,
    scope: getVariableScope(node),
    type: isArray ? type + "[]" : type,
    value,
    preValue: value,
  };

  const possibleVars = context.variables.get(id);
  if (possibleVars) {
    // Variable of the same name exists
    if (Array.isArray(possibleVars)) {
      possibleVars.push(variable);
    } else {
      context.variables.set(id, [possibleVars, variable]);
    }
  } else {
    // First Variable of its name
    context.variables.set(id, variable);
  }
}

export function setPreVariables(context: Context): void {
  for (const id of context.variables.keys()) {
    const possibleVars = context.variables.get(id)!;

    if (Array.isArray(possibleVars)) {
      for (const variable of possibleVars) {
        variable.preValue = variable.value;
      }
    } else {
      possibleVars.preValue = possibleVars.value;
    }
  }
}

export function getLocalVariableMap(
  context: Context,
  node: StateNode,
): Map<string, Variable> {
  const localVars = new Map<string, Variable>();
  for (const id of context.variables.keys()) {
    localVars.set(id, getVariable(id, node, context));
  }
  return localVars;
}
