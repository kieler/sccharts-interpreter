import { SCChartModel, State, Transition } from "../schema/types.js";

export interface TransitionEdge {
	from: StateNode;
	to: StateNode | undefined;
	isImmediate: boolean;
	guard?: string;
	action?: string;
	transition: Transition;
}
export interface StateNode {
	edgesOut: TransitionEdge[];
	edgesIn: TransitionEdge[];
	id: string;
	state: State;
}

export interface StateGraph {
	edges: TransitionEdge[];
	nodes: StateNode[];
	initalNodes: StateNode[];
}

export interface Context {
	model: SCChartModel;
	graph: StateGraph;
	activeStates: Set<StateNode>;
	variables: Map<string, unknown>;
	outputVariables: string[];
	// Input Variables seprate to ignore "faulty" inputs of tick()?
}
