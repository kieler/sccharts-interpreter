import { SCChartModel, State, Transition } from "../schema/types.js";

export interface TransitionEdge {
  from: StateNode;
  to?: StateNode;
  transition: Transition;
}

export interface StateNode {
  id: string;
  edgesOut: TransitionEdge[];
  edgesIn: TransitionEdge[]; // Do I need this?
  subgraphs?: StateGraph[];
  graph: StateGraph;
  state: State;
}

export interface StateGraph {
  edges: TransitionEdge[];
  nodes: StateNode[];
  initalNode?: StateNode;
  terminated: boolean;
  activeNode: StateNode | undefined;
}

export interface Context {
  model: SCChartModel;
  graph: StateGraph;
  variables: Map<string, unknown>;
  outputVariables: string[];
  inputVariables: string[];
  nodeMap: Map<string, StateNode>;
}
