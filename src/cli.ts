import { readFileSync } from "node:fs";
import readline from "node:readline";
import { tick } from "./interpreter/run.js";
import { SCChartModel } from "./schema/types.js";
import { setupContext } from "./interpreter/utils.js";
import { Context, TickResult } from "./interpreter/types.js";

import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import { createSCChartsServices } from "./grammar/sccharts-module.js";

import { preProcess, convertSCTXtoSchema } from "./converter/functions.js";

import { SCTX } from "./grammar/generated/ast.js";

const filePath = process.argv[2];

// This current version needs it to be in a specific spot
// and if not use the -Wonly for exaple is interpreted as the input,
// but '-Wonly' is not valied json
// So for now this is disabled
//
// const jsonInputs = process.argv[3];
const jsonInputs = undefined; // TODO: Add proper way to read in jsonInputs

const wonly = process.argv.includes("-Wonly");

if (wonly) {
  console.log("Warning-only mode enabled");
}

function usage_error() {
  console.error("Usage: npm run cli -- <path-to-model.json> [inputs-list]");
}

function final_message(result: TickResult) {
  console.log("Model terminated - Final Variables:", result.variables);
  process.exit(0);
}

async function convertSctxToJson(model: string): Promise<SCChartModel> {
  model = preProcess(model);

  const services = createSCChartsServices(EmptyFileSystem);
  const parse = parseHelper<SCTX>(services.SCCharts);
  const document = await parse(model as string, { validation: true });

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

  return convertSCTXtoSchema(document.parseResult.value, filePath);
}

if (!filePath) {
  usage_error();
  process.exit(1);
}

let model: unknown;
try {
  model = readFileSync(filePath, "utf-8");
} catch (err) {
  const e = err as Error;
  console.error(`Failed to read file: ${e.message}`);
  process.exit(1);
}

if (filePath.endsWith(".sctx")) {
  model = await convertSctxToJson(model as string);
} else if (filePath.endsWith(".json")) {
  model = JSON.parse(model as string);
} else {
  console.error("Unsupported file type. Only .sctx and .json are supported.");
  process.exit(1);
}

type Item = Record<string, boolean>;

let globalContext: Context;
let referenceMapping: Record<string, SCChartModel> = {};

try {
  globalContext = setupContext(model as SCChartModel, wonly, referenceMapping);
} catch (err) {
  const e = err as Error;
  if (e.message.startsWith("Reference missing")) {
    const path = e.message.substring(e.message.indexOf("-") + 1).trim();

    let subModel: unknown;
    try {
      subModel = readFileSync(path.replace(".json", ".sctx"), "utf-8");
    } catch (err) {
      const e = err as Error;
      console.error(`Failed to read file: ${e.message}`);
      process.exit(1);
    }
    subModel = await convertSctxToJson(subModel as string);

    referenceMapping[path] = subModel as SCChartModel;
    globalContext = setupContext(
      model as SCChartModel,
      wonly,
      referenceMapping,
    );
  } else {
    throw e;
  }
}

console.log("Setup successful. Model", globalContext.model[0].label, "loaded.");

var returnVars: Record<string, any> = {};
for (const varName of globalContext.variables.keys()) {
  const value = globalContext.variables.get(varName);
  if (Array.isArray(value)) {
    for (const v of value) {
      returnVars[v.scope + "_" + varName] = v.value;
    }
  } else {
    returnVars[varName] = value!.value;
  }
}
console.log(JSON.stringify(returnVars, null, 2));

if (jsonInputs == undefined) {
  // Interactive mode: read inputs one tick at the time
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question("Input (JSON): ", async (answer) => {
      if (!answer.trim()) {
        rl.close();
        process.exit(0);
      }

      let input: Item;
      try {
        input = JSON.parse(answer);
      } catch (err) {
        const e = err as Error;
        console.error(`Failed to parse input: ${e.message}`);
        prompt();
        return;
      }

      const result = tick(globalContext, input);
      console.log(JSON.stringify(result, null, 2));

      if (result.terminated) {
        rl.close();
        final_message(result);
      }
      prompt();
    });
  };

  prompt();
} else {
  if (!jsonInputs) {
    usage_error();
    process.exit(1);
  }

  let inputs: Item[];
  try {
    inputs = JSON.parse(jsonInputs);
  } catch (err) {
    const e = err as Error;
    console.error(`Failed to read/parse input list: ${e.message}`);
    process.exit(1);
  }

  for (const input of inputs) {
    const result = tick(globalContext, input);
    console.log(JSON.stringify(result, null, 2));

    if (result.terminated) {
      final_message(result);
    }
  }
}
