import { readFileSync } from "node:fs";

const filePath = process.argv[2];
const inputsString = process.argv[3];
const url = process.argv[4] ?? "http://localhost:19339";
if (!filePath || !inputsString) {
  console.error(
    "Usage: npm run simulation <path-to-sctx.json> <inputs-list> [url]",
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

let inputs: unknown;
try {
  inputs = JSON.parse(inputsString);
} catch (err) {
  const e = err as Error;
  console.error(`Failed to read/parse file: ${e.message}`);
  process.exit(1);
}

type Item = Record<string, boolean>;
type Data = Item[];

const setupResp = await fetch(url + "/setup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model: data }),
});

if (setupResp.status !== 200) {
  const err = await setupResp.json();
  console.error("Setup failed:", err);
  process.exit(1);
}

for (const input of inputs as Data) {
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

  console.log("Input: ", input, " - Output: ", result.output);

  if (result.terminated) {
    console.log("Final Output:", result.output);
    break;
  }
}
