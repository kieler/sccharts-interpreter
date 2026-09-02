import {
  State,
  Region,
  Variable,
  Transition,
  Action,
  SCChartModel,
} from "../schema/types.js";

import {
  SCTX,
  Variable as AstVariable,
  Region as AstRegion,
  Transition as AstTransition,
  State as AstState,
  Action as AstAction,
  Chart,
} from "../grammar/generated/ast.js";
import path from "node:path";

import { readFileSync, writeFileSync } from "node:fs";

import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import { createSCChartsServices } from "../grammar/sccharts-module.js";

export function preProcess(model: string): string {
  // Adds the # needed for the grammar regex, so the expressions can get parsed
  // TODO: if there is a better way to parse the expressions, do that
  // have i mentioned that i strongly dislike langium

  const model_split = model.split("\n");

  for (let i = 0; i < model_split.length; i++) {
    model_split[i] = model_split[i].replace("^", "");

    if (model_split[i].includes("@macro")) {
      model_split[i] = model_split[i]
        .replace(/@macro\s*(?:"[^"]*"\s*,?\s*)+/g, "") // remove @macro + quoted args
        .replace(/\s+/g, " ") // collapse extra spaces
        .trim();
    }

    if (model_split[i].includes("@")) {
      model_split[i] = model_split[i].substring(0, model_split[i].indexOf("@"));
    }

    if (model_split[i].trim().startsWith("#")) {
      model_split[i] = "";
    }

    if (model_split[i].includes("//")) {
      model_split[i] = model_split[i].substring(
        0,
        model_split[i].indexOf("//"),
      );
    }

    var j = 1;
    while (model_split[i].trim().endsWith(";")) {
      // SCCharts allows multiline expressions as long as they are ended with ;
      // but the whole regex thing with # doesn't work with that.
      // so pull them all into one line
      model_split[i] += model_split[i + j].trim();
      model_split[i + j] = "";
      j++;
    }

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
      (model_split[i].includes("int ") ||
        model_split[i].includes("float ") ||
        model_split[i].includes("bool "))
    ) {
      // Split only on commas at brace depth 0 (inside {} don't count)
      const splitByTopLevelComma = (str: string): string[] => {
        const parts: string[] = [];
        let current = "";
        let depth = 0;
        for (const ch of str) {
          if (ch === "{") depth++;
          else if (ch === "}") depth--;
          if (ch === "," && depth === 0) {
            parts.push(current.trim());
            current = "";
          } else {
            current += ch;
          }
        }
        const trimmed = current.trim();
        if (trimmed) parts.push(trimmed);
        return parts;
      };
      const vars = splitByTopLevelComma(model_split[i]);
      for (let j = 0; j < vars.length; j++) {
        if (vars[j].includes("=")) {
          vars[j] = vars[j].replace("=", "=#");
          vars[j] += "#";
        }
      }
      model_split[i] = vars.join(",");
    }
  }

  return model_split.join("\n");
}

function parseChart(chart: Chart, knownModels: Map<string, string>): State {
  const counter = { val: 0 }; // for the auto naming of dummy regions
  const topLevelVars: Variable[] = [];

  const topLevelAstStates: AstState[] = [];
  const topLevelAstRegions: AstRegion[] = [];
  const topLevelAstActions: AstAction[] = [];

  for (const element of chart.elements) {
    if (element.$type === "Variable") {
      convertVariablesToSchema(element, topLevelVars);
    } else if (element.$type === "State") {
      topLevelAstStates.push(element);
    } else if (element.$type === "Region") {
      topLevelAstRegions.push(element);
    } else if (element.$type === "Action") {
      topLevelAstActions.push(element);
    }
  }

  // Convert all top-level states
  const topLevelWrapperStates: State[] = [];
  for (const astState of topLevelAstStates) {
    topLevelWrapperStates.push(
      convertAstStateToSchema(astState, counter, knownModels),
    );
  }

  // Collect explicit top-level regions
  const topLevelSchemaRegions: Region[] = [];
  for (const astRegion of topLevelAstRegions) {
    const schemaRegion = convertAstRegionToSchema(
      astRegion,
      counter,
      knownModels,
    );
    if (topLevelAstStates.length > 0) {
      topLevelWrapperStates.push({
        id: schemaRegion.id,
        label: schemaRegion.label || schemaRegion.id,
        actions: [],
        transitions: [],
        variables: [],
        isInitial: false,
        isFinal: false,
        isConnector: false,
        regions: [schemaRegion],
      });
    } else {
      topLevelSchemaRegions.push(schemaRegion);
    }
  }

  const topLevelWrapperActions: Action[] = [];
  for (const astAction of topLevelAstActions) {
    topLevelWrapperActions.push(convertAction(astAction));
  }

  const rootState: State = {
    id: chart.name,
    label: chart.name,
    actions: topLevelWrapperActions,
    transitions: [],
    variables: topLevelVars,
    isInitial: false,
    isFinal: false,
    isConnector: false,
    regions:
      topLevelAstStates.length > 0
        ? [
            {
              id: `_regionR${counter.val++}`,
              label: `_regionR${counter.val - 1}`,
              states:
                topLevelWrapperStates.length > 0 ? topLevelWrapperStates : [],
            },
          ]
        : topLevelSchemaRegions,
  };

  return rootState;
}

export async function parseModelFile(filePath: string): Promise<SCTX> {
  let model: string;
  try {
    model = readFileSync(filePath, "utf-8");
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

  return document.parseResult.value;
}

async function manageImports(
  imports: string[],
  directory: string,
): Promise<Map<string, string>> {
  // chart_name -> file_path
  let models: Map<string, string> = new Map();

  for (const imp of imports) {
    const fullPath = path.resolve(path.join(directory, imp + ".sctx"));
    console.log("Importing", fullPath);

    const parsedModel = await parseModelFile(fullPath);
    const jsonModels = await convertSCTXtoSchema(parsedModel, fullPath);

    for (const model of jsonModels) {
      models.set(model.id, fullPath);
    }
  }

  return models;
}

export async function convertSCTXtoSchema(
  parsed: SCTX,
  inputFilePath: string,
): Promise<SCChartModel> {
  const charts: State[] = [];
  const directory = path.resolve(path.dirname(inputFilePath));

  const knownModels: Map<string, string> = await manageImports(
    parsed.imports,
    directory,
  );
  for (const chart of parsed.charts) {
    knownModels.set(chart.name, "this");
  }

  for (const chart of parsed.charts) {
    charts.push(parseChart(chart, knownModels));
  }

  return charts;
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
      cardinalities: assignment.cardinalities,
    };

    if (assignment.initialValue !== undefined) {
      varEntry.initialValue = assignment.initialValue
        .replaceAll("#", "")
        .trim();
    }

    target.push(varEntry);
  }
}

function convertAstStateToSchema(
  astState: AstState,
  counter: { val: number },
  knownModels: Map<string, string>,
): State {
  const schemaState: State = {
    id: astState.name,
    label: astState.name,
    actions: astState.actions.map((a) => convertAction(a)),
    transitions: astState.transitions.map((t) => convertTransition(t)),
    variables: [],
    isInitial: astState.isInitial,
    isFinal: astState.isFinal,
    isConnector: astState.isConnector,
    regions: [],
  };

  // Very janky
  // TODO: do this in a way that it works in the browser
  // TODO: What about the imports?
  if (astState.reference) {
    const path = knownModels.get(astState.reference);
    if (path === undefined) {
      throw new Error(`Reference ${astState.reference} not found`);
    }

    schemaState.reference = {
      targetID: astState.reference,
      parameters: [],
    };

    if (path !== "this") {
      schemaState.reference.targetFile = "file:" + path;
    }

    for (const param of astState.refAssignments) {
      schemaState.reference.parameters.push(
        (param.from ?? "null") + " to " + param.to,
      );
    }
  }

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
    const schemaRegion = convertAstRegionToSchema(region, counter, knownModels);
    schemaState.regions.push(schemaRegion);
  }

  // If there are direct child states without an explicit region wrapper, create a dummy region
  if (nestedStates.length > 0 && nestedRegions.length === 0) {
    const dummyRegionName = `_regionR${counter.val++}`;
    const innerStates: State[] = [];

    for (const nestedState of nestedStates) {
      // Process this nested state's own variables from its elements array
      const childSchema = convertAstStateToSchema(
        nestedState,
        counter,
        knownModels,
      );

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
      const childSchema = convertAstStateToSchema(
        nestedState,
        counter,
        knownModels,
      );
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
  knownModels: Map<string, string>,
): Region {
  const regionName = astRegion.name || `_regionR${counter.val++}`;
  const innerStates: State[] = [];

  for (const element of astRegion.elements) {
    if (element.$type === "State") {
      const schemaState = convertAstStateToSchema(
        element,
        counter,
        knownModels,
      );
      innerStates.push(schemaState);
    } else if (element.$type === "Variable") {
      // Variables inside a region attached to the region itself somehow
      // Since regions don't have variables in our schema, we create a holder state
      const variables: Variable[] = [];

      for (const assignment of element.assignments) {
        const varEntry: Variable = {
          id: assignment.name,
          type: element.type,
          isInput: element.isInput,
          isOutput: element.isOutput,
          cardinalities: assignment.cardinalities,
        };

        if (assignment.initialValue !== undefined) {
          varEntry.initialValue = assignment.initialValue
            .replaceAll("#", "")
            .trim();
        }

        variables.push(varEntry);
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
          variables: variables,
          isInitial: false,
          isFinal: false,
          isConnector: false,
          regions: [],
        });
      }
    } else if (element.$type === "Region") {
      const nestedSchemaRegion = convertAstRegionToSchema(
        element,
        counter,
        knownModels,
      );
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
