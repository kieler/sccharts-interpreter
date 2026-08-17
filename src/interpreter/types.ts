import { Action, SCChartModel, State, Transition } from "../schema/types.js";

export enum Severity {
  Error,
  Warning,
}

export interface Message {
  severity: Severity;
  text: string;
}

export interface TransitionEdge {
  from: StateNode;
  to?: StateNode;
  transition: Transition;
}

export interface StateNode {
  id: string;

  weakEdges: TransitionEdge[];
  strongEdges: TransitionEdge[];
  joinEdges: TransitionEdge[];

  entryActions: Action[];
  duringActions: Action[];
  exitActions: Action[];

  subgraphs?: StateGraph[];
  graph: StateGraph;
  state: State;

  referencedContext?: Context;
  referencedVarMap?: Map<string, string[]>;
}

export interface StateGraph {
  id: string;
  parent: StateNode | undefined;
  edges: TransitionEdge[];
  nodes: StateNode[];
  initalNode?: StateNode;
  terminated: boolean;
  activeNode: StateNode | undefined;
}

export interface Context {
  label: string;
  model: SCChartModel;
  graph: StateGraph;

  variables: Map<string, unknown>;
  preVariables: Map<string, unknown>;
  variableTypes: Map<string, string>;
  outputVariables: string[];
  inputVariables: string[];

  nodeMap: Map<string, StateNode>;
  errorMode: "strict" | "warnings-only";
  messages: Message[];
  activeNodes: Set<StateNode>;
}

export interface TickResult {
  terminated: boolean;
  variables: Record<string, unknown>;
  messages: Message[];
}
