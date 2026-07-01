import { parseAction } from "./actionParser.js";
import { parseGuard } from "./guardParser.js";
import { Context, StateGraph, StateNode, TransitionEdge } from "./types.js";

function addRegionsToRuntime(
  graphs: StateGraph[] | undefined,
  context: Context,
  currentIsImmediate: boolean,
) {
  if (!graphs) return;

  for (const graph of graphs) {
    if (graph.terminated) return;
    if (!graph.initalNode) return;

    graph.activeNode = graph.initalNode;
    if (currentIsImmediate) processNode(graph.activeNode, context);
  }
}

function walkEdge(edge: TransitionEdge, context: Context): boolean {
  // Returns true if edge was walked.

  const guardPass =
    !edge.transition.guard ||
    parseGuard(edge.transition.guard, context.variables);

  if (!guardPass) return false;
  if (!edge.to) return false;

  if (edge.transition.preemption == "termination") {
    // edge.from.subgraphs == undefined should never be the case in a properly defined model
    // If the guard passes and the inner behaviour is done, walk the Edge

    const subGraphDone = edge.from.subgraphs
      ?.flatMap((graph) => graph.terminated)
      .every((x) => x);
    if (!subGraphDone) return false;
  }

  // Clear the current activeNode incase we come back
  // History Transotions?
  edge.from.subgraphs?.forEach((graph) => {
    graph.activeNode = undefined;
    graph.terminated = false;
  });

  for (const action of edge.from.exitActions) {
    if (!action.guard || parseGuard(action.guard, context.variables)) {
      parseAction(action.action, context.variables);
    }
  }

  if (edge.transition.action)
    parseAction(edge.transition.action, context.variables);

  if (edge.to.state.isFinal) {
    edge.to.graph.terminated = true;
  } else {
    edge.to.graph.activeNode = edge.to;

    addRegionsToRuntime(
      edge.to.subgraphs,
      context,
      edge.transition.isImmediate,
    );
  }

  for (const action of edge.to.entryActions) {
    if (!action.guard || parseGuard(action.guard, context.variables)) {
      parseAction(action.action, context.variables);
    }
  }

  if (edge.transition.isImmediate) processNode(edge.to, context);
  // Also implicitly consider all edges from a connector to be immediate for now.
  else if (edge.from.state.isConnector) processNode(edge.to, context);

  return true;
}

function processNode(node: StateNode, context: Context): void {
  if (node.state.isFinal) node.graph.terminated = true;
  if (node.graph.terminated) return;

  console.log("Processing Node: ", node.id);

  for (const edge of node.strongEdges) {
    // If the guard passes for a strong abort, the inner behaviour is not executed
    if (walkEdge(edge, context)) return;
  }

  for (const action of node.duringActions) {
    if (!action.guard || parseGuard(action.guard, context.variables)) {
      parseAction(action.action, context.variables);
    }
  }

  if (node.subgraphs) {
    for (const subgraph of node.subgraphs) {
      if (subgraph.activeNode) {
        processNode(subgraph.activeNode, context);
      } else if (subgraph.initalNode) {
        // If no activeNode exists, the graph has not been initialised
        processNode(subgraph.initalNode, context);
      }
    }
  }

  for (const edge of node.weakEdges) {
    if (walkEdge(edge, context)) return;
  }

  for (const edge of node.joinEdges) {
    if (walkEdge(edge, context)) return;
  }
}

function assignInputVariables(context: Context, inputs: any): void {
  for (const variable of context.inputVariables) {
    if (inputs[variable] !== undefined) {
      context.variables.set(variable, inputs[variable]);
    } else {
      switch (context.variableTypes.get(variable)) {
        case "int":
          context.variables.set(variable, 0);
          break;
        case "string":
          context.variables.set(variable, "");
          break;
        case "bool":
          context.variables.set(variable, false);
          break;
        default:
          context.variables.set(variable, 0);
      }
    }
  }
}

export function tick(context: Context, inputs: any): void {
  if (!context.graph.activeNode) return;

  assignInputVariables(context, inputs);

  processNode(context.graph.activeNode, context);
  console.log(context.variables);
  console.log();
}
