import { validateSCChart } from "../schema/utils.js";
import { Region, SCChartModel, State } from "../schema/types.js";
import { Context, StateGraph, StateNode } from "./types.js";
import { constructStateGraph } from "./constructor.js";
import {
  getVariable,
  getVariablePre,
  setVariable,
  setVariableArrayByIndex,
} from "./variables.js";

export function isSuper(stateNode: StateNode): boolean {
  return stateNode.subgraphs !== undefined;
}

export function rootState(model: SCChartModel): State {
  return model[0];
}

export function createFakeRootRegion(model: SCChartModel): Region {
  const fakeInitState: State = {
    id: "fake_init",
    actions: [],
    transitions: [
      {
        targetID: rootState(model).id,
        isImmediate: false,
        preemption: "weak",
        history: false,
      },
    ],
    variables: [],
    isInitial: true,
    isFinal: false,
    isConnector: false,
    regions: [],
  };

  let fakeRootState: State = rootState(model);
  fakeRootState.transitions = [
    {
      targetID: "fake_final",
      isImmediate: false,
      preemption: "termination",
      history: false,
    },
  ];

  const fakeFinalState: State = {
    id: "fake_final",
    actions: [],
    transitions: [],
    variables: [],
    isInitial: false,
    isFinal: true,
    isConnector: false,
    regions: [],
  };

  return {
    id: "fake_root",
    states: [fakeInitState, fakeRootState, fakeFinalState],
  };
}

export function emptyContext(model: SCChartModel, id: string): Context {
  return {
    model: model,
    label: "",
    graph: {
      id: id,
      parent: undefined,
      edges: [],
      nodes: [],
      initalNode: undefined,
      activeNode: undefined,
      terminated: false,
    },
    variables: new Map(),
    outputVariables: [],
    inputVariables: [],
    nodeMap: new Map(),
    errorMode: "strict" as const,
    messages: [],
    activeNodes: new Set(),
  };
}

export function assignInputVariables(
  context: Context,
  inputs: Record<string, unknown>,
): void {
  for (const variableName of Object.keys(inputs)) {
    if (context.inputVariables.includes(variableName)) {
      setVariable(
        variableName,
        inputs[variableName],
        context.graph.initalNode!,
        context,
      );
    } else if (variableName.includes("[")) {
      const match = variableName.match(/^([^\[]+)\[(\d+)\]$/);
      const name = match?.[1]!;
      const index = parseInt(match?.[2]!, 10);
      setVariableArrayByIndex(
        name,
        index,
        inputs[variableName],
        context.graph.initalNode!,
        context,
      );
    }
  }
}

export function setupContext(
  model: SCChartModel,
  wonly: boolean,
  filePath: string | undefined = undefined,
  referenceMapping: Record<string, SCChartModel> | undefined = undefined,
): Context {
  const valid = validateSCChart(model);
  if (!valid) throw new Error("Invalid SCChart Model JSON");

  const context = constructStateGraph(
    model,
    wonly,
    filePath,
    "",
    referenceMapping,
  );
  context.graph.activeNode = context.graph.initalNode;

  return context;
}

export function pre(
  context: Context,
  variable: string,
  node: StateNode,
): unknown {
  if (variable.includes("[")) {
    const [base, ...indicesStr] = variable.split("[");
    const indices = indicesStr.map((i) => Number(i.replace("]", "")));
    let value = getVariablePre(base, node, context);
    // let value = context.variables.get(base)?.preValue;

    let i = 0;
    while (value instanceof Array) {
      value = value[indices[i]];
      i++;
    }

    return value;
  }

  return getVariablePre(variable, node, context);
}

export function modelPrint(
  context: Context,
  value: string,
  node: StateNode,
): void {
  const possibleValue = getVariable(value, node, context);
  if (possibleValue !== undefined) console.log("[MODEL PRINT]", possibleValue);
  else console.log("[MODEL PRINT]", value);
}

export function getScope(graph: StateGraph): string {
  let scope = "";

  while (graph.parent) {
    scope = graph.parent.id + "." + graph.id + "." + scope;
    graph = graph.parent.graph;
  }

  return scope;
}

export function getVariableScope(node: StateNode): string {
  return getScope(node.graph) + node.id;
}
