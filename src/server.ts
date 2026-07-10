import express from "express";
import { readFileSync } from "node:fs";
import readline from "node:readline";
import { constructStateGraph } from "./interpreter/constructor.js";
import { tick } from "./interpreter/run.js";
import { findInitalState, validateSCChart } from "./schema/utils.js";
import { SCChartModel } from "./schema/types.js";
import { Severity } from "./interpreter/types.js";

// TODO: "Port KiCo Server to v1"
// import { convertSCTX, generateDiagram } from "./api/kico.js";

const cli_only = process.argv.includes("-cli");
const wonly = process.argv.includes("-Wonly");

if (cli_only) {
  console.log("CLI mode enabled");
}

if (wonly) {
  console.log("Warning-only mode enabled");
}

if (cli_only) {
  const cliIndex = process.argv.indexOf("-cli");
  if (cliIndex === -1 || cliIndex + 1 >= process.argv.length) {
    console.error(
      "Usage: npm start -- -cli <path-to-sctx.json> [inputs-list | -i] [url]",
    );
    process.exit(1);
  }

  const filePath = process.argv[cliIndex + 1];
  const inputsOrMode = process.argv[cliIndex + 2];

  if (!filePath) {
    console.error(
      "Usage: npm start -cli <path-to-sctx.json> [inputs-list | -i] [url]",
    );
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

  const valid = validateSCChart(model);
  if (!valid) throw new Error("Invalid SCChart Model JSON");

  const chartModel = model as SCChartModel;

  if (!findInitalState(chartModel)) throw new Error("No inital state in model");

  const globalContext = constructStateGraph(chartModel);
  globalContext.graph.activeNode = globalContext.graph.initalNode;
  globalContext.errorMode = wonly ? "warnings-only" : "strict";

  let variables: any = [];

  for (const variable of globalContext.variables) {
    variables.push({
      name: variable[0],
      type: globalContext.variableTypes.get(variable[0]) ?? "unknown",
      value: variable[1],
      isInput: globalContext.inputVariables.includes(variable[0]),
      isOutput: globalContext.outputVariables.includes(variable[0]),
    });
  }

  console.log(
    "Setup successful. Model",
    globalContext.model[0].label,
    "loaded.",
  );

  if (process.argv.includes("-i")) {
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
          console.log("Model terminated - Final Variables:", result.variables);
          rl.close();
          process.exit(0);
        }

        prompt();
      });
    };
    prompt();
  } else {
    const inputsString = inputsOrMode;
    if (!inputsString) {
      console.error(
        "Usage: npm run simulation <path-to-sctx.json> <inputs-list> [url]\n       or\n         npm run simulation <path-to-sctx.json> -i [url]",
      );
      process.exit(1);
    }

    let inputs: Item[];
    try {
      inputs = JSON.parse(inputsString);
    } catch (err) {
      const e = err as Error;
      console.error(`Failed to read/parse input list: ${e.message}`);
      process.exit(1);
    }

    for (const input of inputs) {
      const result = tick(globalContext, input);
      console.log(result);

      if (result.terminated) {
        console.log("Model terminated - Final Variables:", result.variables);
        process.exit(0);
      }

      console.log(result.variables);

      if (result.messages && result.messages.length > 0) {
        for (const msg of result.messages) {
          const prefix =
            msg.severity === Severity.Warning ? "[WARNING]" : "[ERROR]";
          console.log(`${prefix}: ${msg.text}`);
        }
      }

      if (result.terminated) {
        console.log("Model terminated - Final Variables:", result.variables);
        break;
      }
    }
  }
} else {
  const server = express();
  server.use(express.json());

  const WEBUI_PORT = parseInt(process.env.WEBUI_PORT ?? "3001");
  server.use(express.static("public"));

  const webui = server.listen(WEBUI_PORT, () => {
    console.log(`Web UI running on http://localhost:${WEBUI_PORT}`);
  });
}

// TODO: "Port KiCo Server to v1"
// server.post("/api/create-diagram", async (req, res) => {
//   const { file, filename } = req.body as { file?: string; filename?: string };
//   if (!file || !filename) {
//     return res
//       .status(400)
//       .json({ type: "error", message: "Missing file or filename" });
//   }

//   const result = await generateDiagram(file, filename);

//   if (result.type === "png") {
//     return res.json({ type: "png", data: result.data });
//   } else {
//     return res.status(500).json({ type: "error", message: result.message });
//   }
// });
