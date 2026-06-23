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

  if (edge.transition.preemption == "termination" && edge.from.subgraphs) {
    // edge.from.subgraphs == undefined should never be the case in a properly defined model
    // If the guard passes and the inner behaviour is done, walk the Edge

    const subGraphDone = edge.from.subgraphs
      .flatMap((graph) => graph.terminated)
      .every((x) => x);
    if (!subGraphDone) return false;

    // Clear the current activeNode incase we come back
    // History Transotions?
    edge.from.subgraphs?.forEach((graph) => {
      graph.activeNode = undefined;
      graph.terminated = false;
    });
  }

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

  for (const action of edge.from.exitActions) {
    if (!action.guard || parseGuard(action.guard, context.variables)) {
      parseAction(action.action, context.variables);
    }
  }

  for (const action of edge.to.entryActions) {
    if (!action.guard || parseGuard(action.guard, context.variables)) {
      parseAction(action.action, context.variables);
    }
  }

  if (edge.transition.action)
    parseAction(edge.transition.action, context.variables);

  if (edge.transition.isImmediate) processNode(edge.to, context);

  return true;
}

function processNode(node: StateNode, context: Context): void {
  if (node.state.isFinal) node.graph.terminated = true;
  if (node.graph.terminated) return;

  console.log("Processing Node: ", node.id);

  for (const edge of node.strongEdges) {
    // If the guard passes for a strong abort, the inner behaviour is not executed
    if (walkEdge(edge, context)) break;
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
      } else {
        processNode(subgraph.nodes[0], context);
      }
    }

    // This should mainly apply to the root node/state
    // It doesn't have any edges and just one node with the programm in a subgraph
    // This is kind of an artifact of how the JSON SCChart Model is structured
    // If thet root node ever gets removed and just the graph as the main graph in the context, this can be removed as well.
    if (
      node.weakEdges.length === 0 &&
      node.strongEdges.length === 0 &&
      node.joinEdges.length === 0 &&
      node.subgraphs.every((graph) => graph.terminated)
    ) {
      node.graph.terminated = true;
    }
  }

  for (const edge of node.weakEdges) {
    if (walkEdge(edge, context)) break;
  }

  for (const edge of node.joinEdges) {
    if (walkEdge(edge, context)) break;
  }
}

export function tick(context: Context, inputs: any): void {
  if (!context.graph.activeNode) return;

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

  // TODO: copy the terminated stuff, because that should only be availbal enext tick as then we are only in the new states
  // or maybe not? it is weird with the compiled version
  // tick 1 A=true -> model finishes on the nex A=true tick
  // tick 2 A=true -> model finishes tick 2
  // tick 3 A=true -> model finishes tick 3
  // ?????????????????
  // Is tick 1 really tick 0 and more like a setup? That would be weird.

  processNode(context.graph.activeNode, context);
  console.log(context.variables);
  console.log();
}
