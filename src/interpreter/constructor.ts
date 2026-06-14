import { Context, StateNode, StateGraph, TransitionEdge } from "./types.js";
import type { SCChartModel, State } from "../schema/types.js";

export function constructStateGraph(model: SCChartModel): Context {
	let nodeMap: Map<string, StateNode> = new Map();
	let heap: State[] = [];

	let context: Context = {
		model: model,
		graph: {
			edges: [],
			nodes: [],
			initalNodes: [],
		},
		activeStates: new Set(),
		variables: new Map(),
		outputVariables: [],
	};

	// Go over all States once and add them and the transitions to the graph
	heap = heap.concat(model);
	while (heap.length > 0) {
		const state = heap.pop();
		if (!state) continue;
		console.log("Processing State: " + state.label);
		heap = heap.concat(state.regions.flatMap((r) => r.states));

		const stateNode: StateNode = {
			id: state.id,
			edgesIn: [],
			edgesOut: [],
			state: state,
		};
		nodeMap.set(state.id, stateNode);

		// Add outgoing transitions / edges
		for (const transition of state.transitions) {
			const transitionEdge: TransitionEdge = {
				from: stateNode,
				to: undefined,
				isImmediate: transition.isImmediate,
				guard: transition.guard,
				action: transition.action,
				transition: transition,
			};
			context.graph.edges.push(transitionEdge);
			stateNode.edgesOut.push(transitionEdge);
		}

		// Add variables
		for (const variable of state.variables) {
			if (variable.initialValue !== undefined) {
				context.variables.set(variable.id, variable.initialValue);
			} else {
				if (variable.type == "int") {
					context.variables.set(variable.id, 0);
				} else if (variable.type == "bool") {
					context.variables.set(variable.id, false);
				} else if (variable.type == "string") {
					context.variables.set(variable.id, "");
				}
				// TODO: the rest
			}

			if (variable.isOutput) {
				context.outputVariables.push(variable.id);
			}
		}

		context.graph.nodes.push(stateNode);
		if (state.isInitial) {
			context.graph.initalNodes.push(stateNode);
		}
	}

	for (const edge of context.graph.edges) {
		const destNode = nodeMap.get(edge.transition.targetID);
		if (!destNode) continue;
		edge.to = destNode;
		destNode.edgesIn.push(edge);
	}

	return context;
}
