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
  State,
} from "../schema/types.js";
import { createFakeRootRegion, emptyContext, getScope } from "./utils.js";
import { readFileSync } from "node:fs";
import { createVariable, getVariable, setPreVariables } from "./variables.js";

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
  wonly: boolean,
  filePath: string | undefined,
  referenceMapping: Record<string, SCChartModel> | undefined = undefined,
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
          constructRegion(
            stateNode,
            subRegion,
            context,
            wonly,
            filePath,
            referenceMapping,
          ),
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
      if (!filePath) {
        throw new Error("File path not provided");
      }

      let refModel;
      let path = state.reference.targetFile
        ? state.reference.targetFile.replace("file:", "")
        : filePath;
      path = path.replace(".sctx", ".json").trim();

      if (referenceMapping) {
        if (!referenceMapping[path])
          throw new Error(`Reference missing: ${path}`);

        refModel = referenceMapping[path];
      } else {
        try {
          const jsonPath = state.reference
            .targetFile!.replace(".sctx", ".json")
            .replace("file:", "");
          refModel = JSON.parse(readFileSync(jsonPath, "utf-8"));
        } catch (e) {
          throw new Error(`Reference missing - ${e}: ${path}`);
        }
      }

      stateNode.referencedContext = constructStateGraph(
        refModel,
        wonly,
        filePath,
        state.reference.targetID,
        referenceMapping,
      );
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

export function constructStateGraph(
  model: SCChartModel,
  wonly: boolean,
  filePath: string | undefined,
  name: string = "", // The name of the chart that should be constructed
  referenceMapping: Record<string, SCChartModel> | undefined = undefined,
): Context {
  let rootState: State | undefined;
  if (name == "") {
    rootState = model[0];
  } else {
    for (const state of model) {
      if (state.id == name) {
        rootState = state;
      }
    }
  }

  if (rootState === undefined) {
    throw new Error(`State ${name} not found`);
  }

  console.log("Setting up model: ", rootState.id);

  const rootRegion: Region = createFakeRootRegion([rootState]);

  let context: Context = emptyContext([rootState], rootRegion.id);
  context.errorMode = wonly ? "warnings-only" : "strict";

  // Go over all States once and add them and the transitions to the graph
  context.graph = constructRegion(
    undefined,
    rootRegion,
    context,
    wonly,
    filePath,
    referenceMapping,
  );

  if (rootState.label) context.label = rootState.label;

  // Go over them a second time and link the edges properly
  finishEdges(context.graph, context);

  setPreVariables(context);

  return context;
}
