import { parseAction } from "./actionParser.js";
import { parseGuard } from "./guardParser.js";
import { Context, StateGraph, StateNode, TransitionEdge } from "./types.js";

function addRegionsToRuntime(
  graphs: StateGraph[] | undefined,
  context: Context,
) {
  if (!graphs) return;

  for (const graph of graphs) {
    if (graph.terminated) return;
    if (!graph.initalNode) return;

    context.activeNodes.add(graph.initalNode);
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
      addRegionsToRuntime(edge.to.subgraphs, context);
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

export function run(context: Context, inputs: any) {
  // TODO: immediate transitions
  // The inital thing here is extremely janky, I need to rework that
  if (!context.graph.nodes[0].subgraphs) return;
  if (!context.graph.nodes[0].subgraphs[0].initalNode) return;

  context.activeNodes.add(context.graph.nodes[0].subgraphs[0].initalNode);

  // "tick()"
  for (const input of inputs) {
    for (const variable in input) {
      context.variables.set(variable, input[variable]);
    }

    if (context.activeNodes.size == 0) return;

    // Cloning the Set, bc activeNodes gets overridden
    for (const node of new Set(context.activeNodes)) {
      processNode(node, context);
    }

    console.log(context.variables);

    for (const state of context.activeNodes) {
      console.log(state.id);
    }
  }
}
