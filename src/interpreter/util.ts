import { Region, SCChartModel, State } from "../schema/types.js";
import { Context, StateNode } from "./types.js";

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
      },
    ],
    variables: [],
    isInitial: true,
    isFinal: false,
    regions: [],
  };

  let fakeRootState: State = rootState(model);
  fakeRootState.transitions = [
    {
      targetID: "fake_final",
      isImmediate: false,
      preemption: "termination",
    },
  ];

  const fakeFinalState: State = {
    id: "fake_final",
    actions: [],
    transitions: [],
    variables: [],
    isInitial: false,
    isFinal: true,
    regions: [],
  };

  return {
    id: "fake_root",
    states: [fakeInitState, fakeRootState, fakeFinalState],
  };
}

export function emptyContext(model: SCChartModel): Context {
  return {
    model: model,
    graph: {
      edges: [],
      nodes: [],
      initalNode: undefined,
      activeNode: undefined,
      terminated: false,
    },
    variables: new Map(),
    variableTypes: new Map(),
    outputVariables: [],
    inputVariables: [],
    nodeMap: new Map(),
  };
}
