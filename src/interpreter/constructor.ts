import type {
  Context,
  StateNode,
  StateGraph,
  TransitionEdge,
  Variable,
} from "./types.js";
import type {
  Region,
  SCChartModel,
  Variable as SchemaVariable,
} from "../schema/types.js";
import { createFakeRootRegion, emptyContext, getScope } from "./utils.js";
import { readFileSync } from "node:fs";
import { createVariable, setPreVariables } from "./variables.js";

function addVariable(
  context: Context,
  variable: SchemaVariable,
  node: StateNode,
) {
  if (variable.isOutput) {
    context.outputVariables.push(variable.id);
  }
  if (variable.isInput) {
    context.inputVariables.push(variable.id);
  }

  createVariable(
    context,
    variable.id,
    node,
    variable.type,
    variable.initialValue,
    variable.cardinalities,
  );
}

function constructRegion(
  parentState: StateNode | undefined,
  region: Region,
  context: Context,
): StateGraph {
  let graph: StateGraph = {
    id: region.id,
    parent: parentState,
    edges: [],
    nodes: [],
    initalNode: undefined,
    activeNode: undefined,
    terminated: false,
  };

  for (const state of region.states) {
    if (!state) continue;

    const isSuper = state.regions.length != 0;

    const stateNode: StateNode = {
      id: state.id,
      joinEdges: [],
      weakEdges: [],
      strongEdges: [],
      entryActions: [],
      duringActions: [],
      exitActions: [],
      state: state,
      graph: graph,
    };
    if (isSuper) {
      stateNode.subgraphs = [];
      for (const subRegion of state.regions) {
        stateNode.subgraphs.push(
          constructRegion(stateNode, subRegion, context),
        );
      }
    }
    if (state.isInitial) graph.initalNode = stateNode;
    context.nodeMap.set(
      JSON.stringify({ id: state.id, scope: getScope(graph) }),
      stateNode,
    );
    graph.nodes.push(stateNode);

    // Add outgoing transitions / edges
    for (const transition of state.transitions) {
      const transitionEdge: TransitionEdge = {
        from: stateNode,
        to: undefined,
        transition: transition,
      };
      graph.edges.push(transitionEdge);

      if (transition.preemption == "weak") {
        stateNode.weakEdges.push(transitionEdge);
      } else if (transition.preemption == "strong") {
        stateNode.strongEdges.push(transitionEdge);
      } else if (transition.preemption == "termination") {
        stateNode.joinEdges.push(transitionEdge);
      }
    }

    // Add variables
    for (const variable of state.variables) {
      addVariable(context, variable, stateNode);
    }

    for (const action of state.actions) {
      switch (action.type) {
        case "entry":
          stateNode.entryActions.push(action);
          break;
        case "during":
          stateNode.duringActions.push(action);
          if (action.isImmediate) {
            stateNode.entryActions.push(action);
          }
          break;
        case "exit":
          stateNode.exitActions.push(action);
          break;
      }
    }

    if (state.reference) {
      if (!readFileSync) {
        throw new Error("File loading not supported");
      }

      let refModel;
      try {
        const jsonPath = state.reference.targetFile
          .replace(".sctx", ".json")
          .replace("file:", "");
        refModel = JSON.parse(readFileSync(jsonPath, "utf-8"));
      } catch (e) {
        throw new Error(
          `Reference missing - ${e} - ${state.reference.targetFile}`,
        );
      }
      stateNode.referencedContext = constructStateGraph(refModel);
      stateNode.referencedContext.graph.activeNode =
        stateNode.referencedContext.graph.initalNode;

      stateNode.referencedVarMap = mapReferenceVariables(
        state.reference.parameters,
      );
    }
  }

  return graph;
}

function mapReferenceVariables(parameters: string[]): Map<string, string[]> {
  // "in to I", "out to O"
  const map = new Map<string, string[]>();
  for (const param of parameters) {
    const [inName, outName] = param.trim().split("to");
    if (!map.has(outName.trim())) {
      map.set(outName.trim(), []);
    }
    map.get(outName.trim())!.push(inName.trim());
  }

  return map;
}

function finishEdges(graph: StateGraph, context: Context): void {
  for (const edge of graph.edges) {
    edge.to = context.nodeMap.get(
      JSON.stringify({
        id: edge.transition.targetID,
        scope: getScope(edge.from.graph),
      }),
    );
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
  if (model.length != 1) {
    throw new Error("Model must have exactly one state");
  }

  console.log("Setting up model: ", model[0].id);

  const rootRegion: Region = createFakeRootRegion(model);

  let context: Context = emptyContext(model, rootRegion.id);

  // Go over all States once and add them and the transitions to the graph
  context.graph = constructRegion(undefined, rootRegion, context);

  if (context.model[0].label) context.label = context.model[0].label;

  // Go over them a second time and link the edges properly
  finishEdges(context.graph, context);

  setPreVariables(context);

  return context;
}
