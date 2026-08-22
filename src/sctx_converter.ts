// TODO: look this over! it works for now, but a lot of AI coding, so I should check

// TODO: reference charts

import { readFileSync, writeFileSync } from "node:fs";

import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import { createSCChartsServices } from "./grammar/sccharts-module.js";

import { preProcess, convertSCTXtoSchema } from "./converter/functions.js";

import { SCTX } from "./grammar/generated/ast.js";

function usage_error() {
  console.error(
    "Usage: npm run convert-sctx <input_path.sctx> [output_path.json]",
  );
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

const result = convertSCTXtoSchema(document.parseResult.value, inputFilePath);

if (ourputFilePath) {
  writeFileSync(ourputFilePath, JSON.stringify(result, null, 2));
} else {
  console.log(JSON.stringify(result, null, 2));
}
