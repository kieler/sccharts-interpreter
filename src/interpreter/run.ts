import { Severity, TickResult } from "./types.js";
import { clearMessages, raise } from "./errors.js";
import { parseAction } from "./actionParser.js";
import { parseGuard } from "./guardParser.js";
import { Context, StateGraph, StateNode, TransitionEdge } from "./types.js";
import { assignInputVariables } from "./utils.js";

function addRegionsToRuntime(
  graphs: StateGraph[] | undefined,
  context: Context,
) {
  if (!graphs) return;

  for (const graph of graphs) {
    if (graph.terminated) return;
    if (!graph.initalNode) return;

    graph.activeNode = graph.initalNode;
    processNode(graph.activeNode, context, true);
  }
}

function resetNode(node: StateNode, context: Context) {
  node.subgraphs?.forEach((graph) => {
    graph.activeNode = undefined;
    graph.terminated = false;

    for (const subNode of graph.nodes) {
      resetNode(subNode, context);
    }
  });
}

function walkEdge(
  edge: TransitionEdge,
  context: Context,
  immediateOnly: boolean,
): boolean {
  // Returns true if edge was walked.
  if (immediateOnly && !edge.transition.isImmediate) return false;

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

  // Clear the history of the state upon entry and all subgraphs
  // TODO: For history transitions, skip this. This has to wait until the JSON exporter supports history transitions
  resetNode(edge.to, context);

  for (const action of edge.from.exitActions) {
    if (!action.guard || parseGuard(action.guard, context.variables)) {
      parseAction(action.action, context.variables);
    }
  }

  if (edge.transition.action)
    parseAction(edge.transition.action, context.variables);

  if (!edge.to.state.isFinal) edge.to.graph.terminated = false;
  edge.to.graph.activeNode = edge.to;
  context.activeNodes.delete(edge.from);

  if (edge.to.state.isFinal) {
    edge.to.graph.terminated = true;
  } else {
    context.activeNodes.add(edge.to);
  }

  processNode(edge.to, context, true);

  // Implicitly consider all edges from a connector to be immediate for now.
  if (edge.to.state.isConnector) processNode(edge.to, context);

  return true;
}

function processNode(
  node: StateNode,
  context: Context,
  entering: boolean = false,
): void {
  // If entering only do immediate outgoing transitions and entering actions

  if (node.state.isFinal) node.graph.terminated = true;
  context.activeNodes.add(node);

  if (entering) {
    for (const action of node.entryActions) {
      if (!action.guard || parseGuard(action.guard, context.variables)) {
        parseAction(action.action, context.variables);
      }
    }
  }

  for (const edge of node.strongEdges) {
    // If the guard passes for a strong abort, the inner behaviour is not executed
    if (walkEdge(edge, context, entering)) return;
  }

  if (!entering) {
    for (const action of node.duringActions) {
      if (!action.guard || parseGuard(action.guard, context.variables)) {
        parseAction(action.action, context.variables);
      }
    }
  }

  if (entering) {
    addRegionsToRuntime(node.subgraphs, context);
  }

  if (node.subgraphs && !entering) {
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
    if (walkEdge(edge, context, entering)) return;
  }

  for (const edge of node.joinEdges) {
    if (walkEdge(edge, context, entering)) return;
  }
}

export function tick(context: Context, inputs: any): TickResult {
  if (!context.graph.activeNode)
    return {
      terminated: false,
      variables: {},
      messages: [],
    };

  assignInputVariables(context, inputs);

  processNode(context.graph.activeNode, context);

  context.activeNodes.forEach(function (node: StateNode) {
    if (node.state.isConnector) {
      raise(
        context,
        Severity.Error,
        `Ending a tick in a connector is not allowed. Connector: ${node.id}`,
      );
    }
  });

  const messages = context.messages;
  clearMessages();
  context.messages = [];
  return {
    terminated: context.graph.terminated,
    variables: Object.fromEntries(context.variables),
    messages: messages,
  };
}
