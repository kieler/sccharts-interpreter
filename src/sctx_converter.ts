import { readFileSync } from "node:fs";

import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import { createSCChartsServices } from "./grammar/sccharts-module.js";
import { SCTX, Element } from "./grammar/generated/ast.js";

import { Region, State, Variable } from "./schema/types.js";

const filePath = process.argv[2];

function usage_error() {
  console.error("Usage: npm run convert-sctx <path-to-model.stcx>");
}

function preProcess(model: string): string {
  // This is the thing with the # at the start and end of expresssions
  // so the fucking regex works, have I mentioned that I hate langium?
  const model_split = model.split("\n");

  for (let i = 0; i < model_split.length; i++) {
    model_split[i] = model_split[i].replace("if", "if#");
    model_split[i] = model_split[i].replace("do", "do#");
    if (model_split[i].includes("if") && model_split[i].includes("do")) {
      model_split[i] = model_split[i].replace("do", "#do");
    }
    if (model_split[i].includes("do")) {
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
  }

  model = model_split.join("\n");
  return model;
}

if (!filePath) {
  usage_error();
  process.exit(1);
}

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

if (document.parseResult.lexerErrors.length > 0) {
  console.error("Lexer errors occurred", document.parseResult.lexerErrors);
  throw new Error("Lexer errors occurred");
}
if (document.parseResult.parserErrors.length > 0) {
  console.error("Lexer errors occurred", document.parseResult.parserErrors);
  throw new Error("Parser errors occurred");
}
console.log("Parsed Model", document.parseResult.value.name);

let rootRegion: Region = {
  id: "_regionR0",
  label: "_regionR0",
  states: [],
};

let rootState: State = {
  id: document.parseResult.value.name,
  label: document.parseResult.value.name,
  actions: [],
  transitions: [],
  variables: [],
  isInitial: false,
  isFinal: false,
  isConnector: false,
  regions: [rootRegion],
};

for (const element of document.parseResult.value.elements) {
  if (element.$type != "Variable") {
    continue;
  }

  for (const assignment of element.assignments) {
    let variable: Variable = {
      id: assignment.name,
      type: element.type,
      isInput: element.isInput,
      isOutput: element.isOutput,
    };

    if (assignment.initialValue !== undefined) {
      variable.initialValue = assignment.initialValue;
    }

    rootState.variables.push(variable);
  }
}

function parseElements(
  elements: Element[],
  parseVariables: boolean = true,
): State[] {
  const states: State[] = [];

  for (const element of elements) {
    switch (element.$type) {
      case "State":
        states.push({
          id: element.name,
          label: element.name,
          actions: [],
          transitions: [],
          variables: [],
          isInitial: element.type === "initial",
          isFinal: element.type === "final",
          isConnector: element.isConnector,
          regions: [],
        });
        break;
      default:
        break;
    }
  }

  return states;
}

rootState.regions[0].states = parseElements(
  document.parseResult.value.elements,
  false,
);

console.log(rootState.regions[0].states);
