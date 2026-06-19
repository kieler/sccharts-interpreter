import { Context, StateNode, StateGraph, TransitionEdge } from "./types.js";
import type { Region, SCChartModel, State } from "../schema/types.js";
import { rootState } from "./util.js";

function constructRegion(region: Region, context: Context): StateGraph {
  // console.log("Region: " + region.id);

  let graph: StateGraph = {
    edges: [],
    nodes: [],
    initalNode: undefined,
    activeNode: undefined,
    terminated: false,
  };

  for (const state of region.states) {
    if (!state) continue;
    // console.log("  State: " + state.label);

    const isSuper = state.regions.length != 0;

    const stateNode: StateNode = {
      id: state.id,
      edgesIn: [],
      edgesOut: [],
      state: state,
      graph: graph,
    };
    if (isSuper) {
      stateNode.subgraphs = [];
      for (const subRegion of state.regions) {
        stateNode.subgraphs.push(constructRegion(subRegion, context));
      }
    }
    if (state.isInitial) graph.initalNode = stateNode;
    context.nodeMap.set(state.id, stateNode);
    graph.nodes.push(stateNode);

    // Add outgoing transitions / edges
    for (const transition of state.transitions) {
      const transitionEdge: TransitionEdge = {
        from: stateNode,
        to: undefined,
        transition: transition,
      };
      graph.edges.push(transitionEdge);
      stateNode.edgesOut.push(transitionEdge);
    }

    // Add variables
    for (const variable of state.variables) {
      if (variable.initialValue !== undefined) {
        // WHYYYYYLIhycxiuv ndifnh vnksfxvh i
        // Why does KiCo export every variable inital value as stinrg?
        // apparently c: bool = "true" sets it to true????
        if (variable.type == "int") {
          context.variables.set(variable.id, Number(variable.initialValue));
        } else if (variable.type == "bool") {
          if (variable.initialValue == "true")
            context.variables.set(variable.id, true);
          else context.variables.set(variable.id, false);
        } else {
          context.variables.set(variable.id, variable.initialValue);
        }
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
      if (variable.isInput) {
        context.inputVariables.push(variable.id);
      }
    }
  }

  return graph;
}

function finishEdges(graph: StateGraph, context: Context): void {
  for (const edge of graph.edges) {
    edge.to = context.nodeMap.get(edge.transition.targetID);
  }
  for (const node of graph.nodes) {
    if (node.subgraphs) {
      for (const subgraph of node.subgraphs) {
        finishEdges(subgraph, context);
      }
    }
  }
}

export function constructStateGraph(model: SCChartModel): Context {
  const rootRegion: Region = { id: "top", states: [rootState(model)] };

  let context: Context = {
    model: model,
    graph: {
      edges: [],
      nodes: [],
      initalNode: undefined,
      activeNode: undefined,
      terminated: false,
    },
    variables: new Map(),
    outputVariables: [],
    inputVariables: [],
    nodeMap: new Map(),
  };

  // Go over all States once and add them and the transitions to the graph
  context.graph = constructRegion(rootRegion, context);

  // Add the root node as inital, so the progamm starts
  context.graph.initalNode = context.graph.nodes[0];

  // Go over them a second time and link the edges properly
  finishEdges(context.graph, context);

  return context;
}
