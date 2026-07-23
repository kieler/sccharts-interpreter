import { Severity, TickResult } from "./types.js";
import { clearMessages, raise } from "./errors.js";
import { parseAction } from "./actionParser.js";
import { parseGuard } from "./guardParser.js";
import { Context, StateGraph, StateNode, TransitionEdge } from "./types.js";
import { Action } from "../schema/types.js";
import { assignInputVariables } from "./utils.js";

function addRegionsToRuntime(
  graphs: StateGraph[] | undefined,
  context: Context,
) {
  if (!graphs) return;

  for (const graph of graphs) {
    if (graph.terminated) return;
    if (!graph.initalNode) return;

    if (!graph.activeNode) graph.activeNode = graph.initalNode;
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
  if (
    immediateOnly &&
    !(
      edge.transition.isImmediate || edge.transition.preemption == "termination"
    )
  )
    return false;

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
  if (!edge.transition.history) resetNode(edge.to, context);

  doActions(edge.from.exitActions, context);

  if (edge.transition.action) parseAction(edge.transition.action, context);

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

function doActions(actions: Action[], context: Context) {
  for (const action of actions) {
    if (!action.guard || parseGuard(action.guard, context.variables)) {
      parseAction(action.action, context);
    }
  }
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
    doActions(node.entryActions, context);
  }

  for (const edge of node.strongEdges) {
    // If the guard passes for a strong abort, the inner behaviour is not executed
    if (walkEdge(edge, context, entering)) return;
  }

  if (!entering) {
    doActions(node.duringActions, context);
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

    const subGraphDone = node.subgraphs
      ?.flatMap((graph) => graph.terminated)
      .every((x) => x);
    if (subGraphDone) {
      doActions(node.exitActions, context);
    }
  }

  if (node.referencedContext && node.referencedVarMap) {
    for (const [outer, inner] of node.referencedVarMap.entries()) {
      for (const i of inner) {
        node.referencedContext.variables.set(i, context.variables.get(outer));
      }
    }

    const results = tick(node.referencedContext, {}, false);

    for (const [outer, inner] of node.referencedVarMap.entries()) {
      for (const i of inner) {
        context.variables.set(outer, node.referencedContext.variables.get(i));
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

export function tick(
  context: Context,
  inputs: any,
  assignInputs: boolean = true,
): TickResult {
  if (!context.graph.activeNode)
    return {
      terminated: false,
      variables: {},
      messages: [],
    };

  context.preVariables = new Map(context.variables);
  if (assignInputs) assignInputVariables(context, inputs);
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
