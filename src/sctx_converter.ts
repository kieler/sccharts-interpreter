import { readFileSync } from "node:fs";

import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import { createSCChartsServices } from "./grammar/sccharts-module.js";
import { SCTX } from "./grammar/generated/ast.js";

const filePath = process.argv[2];

function usage_error() {
  console.error("Usage: npm run convert-sctx <path-to-model.stcx>");
}

function preProcess(model: string): string {
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
        model_split[i] = model_split[i].replace("join to", "join to");
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
  throw new Error("Lexer errors occurred");
}
if (document.parseResult.parserErrors.length > 0) {
  throw new Error("Parser errors occurred");
}
console.log("Parsed Model", document.parseResult.value.name);
console.log(document.parseResult.value.elements[0]);
