import { validateSCChart } from "../schema/utils.js";
import { Region, SCChartModel, State } from "../schema/types.js";
import { Context, StateNode } from "./types.js";
import { constructStateGraph } from "./constructor.js";

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
    preVariables: new Map(),
    variableTypes: new Map(),
    outputVariables: [],
    inputVariables: [],
    nodeMap: new Map(),
    errorMode: "strict" as const,
    messages: [],
    activeNodes: new Set(),
  };
}

export function assignInputVariables(context: Context, inputs: any): void {
  for (const variable of context.inputVariables) {
    if (inputs[variable] !== undefined) {
      context.variables.set(variable, inputs[variable]);
    }
  }
}

export function setupContext(model: SCChartModel, wonly: boolean): Context {
  const valid = validateSCChart(model);
  if (!valid) throw new Error("Invalid SCChart Model JSON");

  const chartModel = model as SCChartModel;

  const context = constructStateGraph(chartModel);
  context.graph.activeNode = context.graph.initalNode;
  context.errorMode = wonly ? "warnings-only" : "strict";

  return context;
}

export function pre(context: Context, variable: string): unknown {
  console.log(variable, context.preVariables.get(variable));
  return context.preVariables.get(variable);
}
