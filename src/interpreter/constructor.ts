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
import {
  createFakeRootRegion,
  emptyContext,
  getScope,
  setPreVars,
} from "./utils.js";
import { readFileSync } from "node:fs";
import { parseExpression } from "./actionParser.js";

function initialArrayValues(
  cardinalities: number[],
  defaultValue: unknown,
): unknown[] {
  if (cardinalities.length == 0) {
    return [];
  }

  const [size, ...rest] = cardinalities;
  const array: any[] = [];

  for (let i = 0; i < size; i++) {
    if (rest.length == 0) {
      array.push(defaultValue);
    } else {
      array.push(initialArrayValues(rest, defaultValue));
    }
  }

  return array;
}

function parseScalar(value: any, type: string, context: Context): unknown {
  const parsed_value = parseExpression(value, context, type);
  return parsed_value;
}

function parseArrayValues(valueStr: string): unknown[] {
  valueStr = valueStr.replaceAll("{", "[").replaceAll("}", "]");

  return eval(valueStr);
}

function variableDefaults(
  context: Context,
  variable: SchemaVariable,
  isArray: boolean,
) {
  const defaultValues: Record<string, unknown> = {
    int: 0,
    bool: false,
    string: null,
    float: 0.0,
  };

  let assignVar: Variable;

  if (isArray) {
    const array = initialArrayValues(
      variable.cardinalities,
      defaultValues[variable.type],
    );

    assignVar = {
      id: variable.id,
      scope: "", // TODO: proper variable scope
      type: variable.type + "[]",
      value: array,
      preValue: null,
    };
    context.variables.set(variable.id, assignVar);

    return;
  }

  assignVar = {
    id: variable.id,
    scope: "", // TODO: proper variable scope
    type: variable.type,
    value: defaultValues[variable.type],
    preValue: null,
  };
  context.variables.set(variable.id, assignVar);
}

function variableValues(
  context: Context,
  variable: SchemaVariable,
  isArray: boolean,
) {
  if (isArray && typeof variable.initialValue === "string") {
    const parsed = parseArrayValues(variable.initialValue!);
    const assignVar = {
      id: variable.id,
      scope: "", // TODO: proper variable scope
      type: variable.type + "[]",
      value: parsed,
      preValue: null,
    };
    context.variables.set(variable.id, assignVar);
  } else {
    const assignVar = {
      id: variable.id,
      scope: "", // TODO: proper variable scope
      type: variable.type,
      value: parseScalar(variable.initialValue!, variable.type, context),
      preValue: null,
    };

    context.variables.set(variable.id, assignVar);
  }
}

function addVariable(context: Context, variable: SchemaVariable) {
  const isArray = variable.cardinalities.length != 0;

  if (variable.isOutput) {
    context.outputVariables.push(variable.id);
  }
  if (variable.isInput) {
    context.inputVariables.push(variable.id);
  }

  if (variable.initialValue === undefined) {
    variableDefaults(context, variable, isArray);
  } else {
    variableValues(context, variable, isArray);
  }
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
      addVariable(context, variable);
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

  setPreVars(context);

  return context;
}
