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

    context.activeNodes.add(graph.initalNode);
    if (currentIsImmediate) processNode(graph.initalNode, context);
  }
}

function walkEdge(edge: TransitionEdge, context: Context): StateNode {
  // Returns the StateNode it ends at

  let node = edge.from;

  // If (edge.from.subgraphs) then edge.from is SuperState
  // Else we just say true
  let subGraphDone = true;
  if (edge.from.subgraphs) {
    subGraphDone = edge.from.subgraphs
      .flatMap((graph) => graph.terminated)
      .every((x) => x);
  }

  const guardPass =
    !edge.transition.guard ||
    parseGuard(edge.transition.guard, context.variables);

  if (guardPass && subGraphDone) {
    if (!edge.to) return node;

    if (edge.to.state.isFinal) {
      edge.to.graph.terminated = true;
    } else {
      context.activeNodes.add(edge.to);
      addRegionsToRuntime(
        edge.to.subgraphs,
        context,
        edge.transition.isImmediate,
      );
    }

    if (edge.transition.action)
      parseAction(edge.transition.action, context.variables);

    context.activeNodes.delete(edge.from);

    if (edge.transition.isImmediate) {
      processNode(edge.to, context);
    }

    node = edge.to;
  }

  return node;
}

function processNode(node: StateNode, context: Context): void {
  for (const edge of node.edgesOut) {
    const nextNode = walkEdge(edge, context);
    if (nextNode?.id != node.id) {
      break;
    }
  }
}

export function tick(context: Context, inputs: any): void {
  if (context.activeNodes.size == 0) return;

  for (const variable in inputs) {
    // if (!context.inputVariables.includes(variable)) continue;
    context.variables.set(variable, inputs[variable]);
  }

  // TODO: copy the terminated stuff, because that should only be availbal enext tick as then we are only in the new states
  // ore maybe not? it is weird with the compiled version
  // tick 1 A=true -> model finishes tick 2
  // tick 2 A=true -> model finishes tick 2
  // tick 3 A=true -> model finishes tick 3
  // ?????????????????

  // Cloning the Set, bc activeNodes gets overridden
  for (const node of new Set(context.activeNodes)) {
    processNode(node, context);
  }
}
