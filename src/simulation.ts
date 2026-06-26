import { readFileSync } from "node:fs";
import readline from "node:readline";

const filePath = process.argv[2];
const inputsOrMode = process.argv[3];
const url = process.argv[4] ?? "http://localhost:19339";
if (!filePath) {
  console.error(
    "Usage: npm run simulation <path-to-sctx.json> [inputs-list | -i] [url]",
  );
  process.exit(1);
}

let data: unknown;
try {
  data = JSON.parse(readFileSync(filePath, "utf-8"));
} catch (err) {
  const e = err as Error;
  console.error(`Failed to read/parse file: ${e.message}`);
  process.exit(1);
}

type Item = Record<string, boolean>;

const setupResp = await fetch(url + "/setup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model: data }),
});

console.log("Setup done");

if (setupResp.status !== 200) {
  const err = await setupResp.json();
  console.error("Setup failed:", err);
  process.exit(1);
}

if (inputsOrMode === "-i") {
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

      const tickResp = await fetch(url + "/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: input }),
      });

      if (tickResp.status !== 200) {
        const err = await tickResp.json();
        console.error("Tick failed:", tickResp.status, err);
        rl.close();
        process.exit(1);
      }
      const result = await tickResp.json();

      console.log(result.variables);

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
    const tickResp = await fetch(url + "/tick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: input }),
    });

    if (tickResp.status !== 200) {
      const err = await tickResp.json();
      console.error("Tick failed:", err);
      process.exit(1);
    }
    const result = await tickResp.json();

    console.log(result.variables);

    if (result.terminated) {
      console.log("Model terminated - Final Variables:", result.ariables);
      break;
    }
  }
}
