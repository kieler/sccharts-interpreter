import { readFileSync } from "node:fs";
import readline from "node:readline";
import { tick } from "./interpreter/run.js";
import { SCChartModel } from "./schema/types.js";
import { setupContext } from "./interpreter/utils.js";
import { TickResult } from "./interpreter/types.js";

const filePath = process.argv[2];
const jsonInputs = process.argv[3];
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

if (!filePath) {
  usage_error();
  process.exit(1);
}

let model: unknown;
try {
  model = JSON.parse(readFileSync(filePath, "utf-8"));
} catch (err) {
  const e = err as Error;
  console.error(`Failed to read/parse file: ${e.message}`);
  process.exit(1);
}

type Item = Record<string, boolean>;

const globalContext = setupContext(model as SCChartModel, wonly);

console.log("Setup successful. Model", globalContext.model[0].label, "loaded.");

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
      console.log(result);

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
    console.log(result);

    if (result.terminated) {
      final_message(result);
    }
  }
}
