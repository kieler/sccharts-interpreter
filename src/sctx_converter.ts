// TODO: look this over! it works for now, but a lot of AI coding, so I should check

import { readFileSync, writeFileSync } from "node:fs";

import { EmptyFileSystem, LangiumSharedCoreServices } from "langium";
import { parseHelper } from "langium/test";
import { createSCChartsServices } from "./grammar/sccharts-module.js";
import {
  SCTX,
  Element,
  Variable as AstVariable,
  Region as AstRegion,
  Transition as AstTransition,
  State as AstState,
  Action as AstAction,
} from "./grammar/generated/ast.js";
import {
  State,
  Region,
  Variable,
  Transition,
  Action,
  SCChartModel,
} from "./schema/types.js";

function usage_error() {
  console.error(
    "Usage: npm run convert-sctx <input_path.sctx> [output_path.json]",
  );
}

export function preProcess(model: string): string {
  // Adds the # needed for the grammar regex, so the expressions can get parsed
  // TODO: if there is a better way to parse the expressions, do that
  // have i mentioned that i strongly dislike langium
  const model_split = model.split("\n");

  for (let i = 0; i < model_split.length; i++) {
    model_split[i] = model_split[i].replace("if ", "if#");
    model_split[i] = model_split[i].replace("do ", "do#");
    if (model_split[i].includes("if ") && model_split[i].includes("do ")) {
      model_split[i] = model_split[i].replace("do ", "#do");
    } else if (
      model_split[i].includes("if#") &&
      model_split[i].includes("do#")
    ) {
      model_split[i] = model_split[i].replace("do#", "#do#");
    }
    if (
      model_split[i].includes("do#") ||
      (!model_split[i].includes("do#") && model_split[i].includes("if#"))
    ) {
      if (model_split[i].includes("go to")) {
        model_split[i] = model_split[i].replace("go to", "#go to");
      } else if (model_split[i].includes("join to")) {
        model_split[i] = model_split[i].replace("join to", "#join to");
      } else if (model_split[i].includes("abort to")) {
        model_split[i] = model_split[i].replace("abort to", "#abort to");
      } else {
        model_split[i] += "#";
      }
    }

    // Variable Assignment ExpressionString
    if (
      model_split[i].includes("=") &&
      (model_split[i].includes("int") ||
        model_split[i].includes("float") ||
        model_split[i].includes("bool"))
    ) {
      model_split[i] = model_split[i].replaceAll("=", "=#");
      model_split[i] = model_split[i].replaceAll(",", "#,");
      model_split[i] += "#";
    }
  }

  return model_split.join("\n");
}

export function convertSCTXtoSchema(parsed: SCTX): SCChartModel {
  const counter = { val: 0 }; // for the auto naming of dummy regions
  const topLevelVars: Variable[] = [];

  const topLevelAstStates: AstState[] = [];
  const topLevelAstRegions: AstRegion[] = [];

  for (const element of parsed.elements) {
    if (element.$type === "Variable") {
      convertVariablesToSchema(element, topLevelVars);
    } else if (element.$type === "State") {
      topLevelAstStates.push(element);
    } else if (element.$type === "Region") {
      topLevelAstRegions.push(element);
    }
  }

  // Convert all top-level states
  const wrapperRegionStates: State[] = [];
  for (const astState of topLevelAstStates) {
    wrapperRegionStates.push(convertAstStateToSchema(astState, counter));
  }

  // Add explicit top-level regions as sub-states in the root's regions list
  for (const astRegion of topLevelAstRegions) {
    const schemaRegion = convertAstRegionToSchema(astRegion, counter);
    wrapperRegionStates.push({
      id: schemaRegion.id,
      label: schemaRegion.label || schemaRegion.id,
      actions: [],
      transitions: [],
      variables: [],
      isInitial: false,
      isFinal: false,
      isConnector: false,
      regions: [],
    });
  }

  const dummyRootRegionName = `_regionR${counter.val++}`;

  const rootState: State = {
    id: parsed.name,
    label: parsed.name,
    actions: [],
    transitions: [],
    variables: topLevelVars,
    isInitial: false,
    isFinal: false,
    isConnector: false,
    regions: [
      {
        id: dummyRootRegionName,
        label: dummyRootRegionName,
        states: wrapperRegionStates.length > 0 ? wrapperRegionStates : [],
      },
    ],
  };

  return [rootState];
}

function convertVariablesToSchema(
  variable: AstVariable,
  target: Variable[],
): void {
  for (const assignment of variable.assignments) {
    const varEntry: Variable = {
      id: assignment.name,
      type: variable.type,
      isInput: variable.isInput,
      isOutput: variable.isOutput,
    };

    if (assignment.initialValue !== undefined) {
      varEntry.initialValue = assignment.initialValue
        .replaceAll("#", "")
        .trim();
    }

    target.push(varEntry);
  }
}

export function convertAstStateToSchema(
  astState: AstState,
  counter: { val: number },
): State {
  const schemaState: State = {
    id: astState.name,
    label: astState.name,
    actions: astState.actions.map((a) => convertAction(a)),
    transitions: astState.transitions.map((t) => convertTransition(t)),
    variables: [],
    isInitial: astState.type === "initial",
    isFinal: astState.type === "final",
    isConnector: astState.isConnector,
    regions: [],
  };

  // Separate nested elements into categories
  const nestedStates: AstState[] = [];
  const nestedRegions: AstRegion[] = [];
  const nestedVariables: AstVariable[] = [];

  for (const element of astState.elements) {
    if (element.$type === "Region") {
      nestedRegions.push(element);
    } else if (element.$type === "State") {
      nestedStates.push(element);
    } else if (element.$type === "Variable") {
      nestedVariables.push(element);
    }
  }

  // Add variables declared directly on this state
  for (const varAst of nestedVariables) {
    convertVariablesToSchema(varAst, schemaState.variables);
  }

  // Process explicit regions first
  for (const region of nestedRegions) {
    const schemaRegion = convertAstRegionToSchema(region, counter);
    schemaState.regions.push(schemaRegion);
  }

  // If there are direct child states without an explicit region wrapper, create a dummy region
  if (nestedStates.length > 0 && nestedRegions.length === 0) {
    const dummyRegionName = `_regionR${counter.val++}`;
    const innerStates: State[] = [];

    for (const nestedState of nestedStates) {
      // Process this nested state's own variables from its elements array
      const childSchema = convertAstStateToSchema(nestedState, counter);

      // If the nested state has direct variable declarations in its elements[],
      // we need to attach them. They were already processed inside convertAstStateToSchema.
      innerStates.push(childSchema);
    }

    schemaState.regions.push({
      id: dummyRegionName,
      label: dummyRegionName,
      states: innerStates,
    });
  } else if (nestedStates.length > 0 && nestedRegions.length > 0) {
    // Has both explicit regions AND direct child states: create dummy region for the direct states
    const dummyRegionName = `_regionR${counter.val++}`;
    const innerStates: State[] = [];

    for (const nestedState of nestedStates) {
      const childSchema = convertAstStateToSchema(nestedState, counter);
      innerStates.push(childSchema);
    }

    schemaState.regions.push({
      id: dummyRegionName,
      label: dummyRegionName,
      states: innerStates,
    });
  }

  return schemaState;
}

function convertAstRegionToSchema(
  astRegion: AstRegion,
  counter: { val: number },
): Region {
  const regionName = astRegion.name || `_regionR${counter.val++}`;
  const innerStates: State[] = [];

  for (const element of astRegion.elements) {
    if (element.$type === "State") {
      const schemaState = convertAstStateToSchema(element, counter);
      innerStates.push(schemaState);
    } else if (element.$type === "Variable") {
      // Variables inside a region attached to the region itself somehow
      // Since regions don't have variables in our schema, we create a holder state
      const varEntry: Variable = {
        id: element.assignments[0].name,
        type: element.type,
        isInput: element.isInput,
        isOutput: element.isOutput,
      };
      if (element.assignments[0].initialValue !== undefined) {
        varEntry.initialValue = element.assignments[0].initialValue;
      }

      // Check if there's already a holder state in this region for variables
      const existingHolder = innerStates.find((s) =>
        s.id.startsWith("__varholder_"),
      );
      if (existingHolder) {
        convertVariablesToSchema(element, existingHolder.variables);
      } else {
        innerStates.push({
          id: `__varholder_${regionName}`,
          label: "",
          actions: [],
          transitions: [],
          variables: [varEntry],
          isInitial: false,
          isFinal: false,
          isConnector: false,
          regions: [],
        });
      }
    } else if (element.$type === "Region") {
      const nestedSchemaRegion = convertAstRegionToSchema(element, counter);
      innerStates.push({
        id: element.name || `_regionR${counter.val++}`,
        label: "",
        actions: [],
        transitions: [],
        variables: [],
        isInitial: false,
        isFinal: false,
        isConnector: false,
        regions: [nestedSchemaRegion],
      });
    }
  }

  return {
    id: regionName,
    label: regionName,
    states: innerStates,
  };
}

function convertAction(action: AstAction): Action {
  const a: Action = {
    type: action.type as "during" | "entry" | "exit",
    isImmediate: action.isImmediate,
    action: action.action.replaceAll("#", "").trim(),
  };

  if (action.guard !== undefined) {
    a.guard = action.guard.replaceAll("#", "").trim();
  }

  return a;
}

function convertTransition(transition: AstTransition): Transition {
  const preemptionMap: Record<string, "strong" | "weak" | "termination"> = {
    abort: "strong",
    go: "weak",
    join: "termination",
  };

  let targetID = "";
  if (transition.target !== null) {
    const resolvedRef = transition.target.ref;
    if (
      resolvedRef &&
      typeof resolvedRef === "object" &&
      "name" in resolvedRef
    ) {
      targetID = (resolvedRef as AstState).name;
    }
  }

  const tr: Transition = {
    targetID: targetID || "",
    isImmediate: transition.isImmediate,
    history: transition.history,
    preemption: preemptionMap[transition.type] || "weak",
  };

  if (transition.guard !== undefined) {
    tr.guard = transition.guard.replaceAll("#", "").trim();
  }

  if (transition.action !== undefined) {
    tr.action = transition.action.replaceAll("#", "").trim();
  } else {
    tr.action = "";
  }

  return tr;
}

const inputFilePath = process.argv[2];
const ourputFilePath = process.argv[3];

if (!inputFilePath) {
  usage_error();
  process.exit(1);
}

let model: string;
try {
  model = readFileSync(inputFilePath, "utf-8");
} catch (err) {
  const e = err as Error;
  console.error(`Failed to read/parse file: ${e.message}`);
  process.exit(1);
}

model = preProcess(model);

const services = createSCChartsServices(EmptyFileSystem);
const parse = parseHelper<SCTX>(services.SCCharts);
const document = await parse(model, { validation: true });

if (
  document.parseResult.lexerErrors.length > 0 ||
  document.parseResult.parserErrors.length > 0
) {
  console.error(model);
  console.error(
    "Errors:",
    document.parseResult.lexerErrors,
    document.parseResult.parserErrors,
  );
  throw new Error("Lexer or Parser errors occurred");
}

const result = convertSCTXtoSchema(document.parseResult.value);

if (ourputFilePath) {
  writeFileSync(ourputFilePath, JSON.stringify(result, null, 2));
} else {
  console.log(JSON.stringify(result, null, 2));
}
