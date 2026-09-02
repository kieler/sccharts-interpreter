import { writeFileSync } from "node:fs";
import { convertSCTXtoSchema, parseModelFile } from "./converter/functions.js";

function usage_error() {
  console.error(
    "Usage: npm run convert-sctx <input_path.sctx> -- [output_path.json / -ip]",
  );
}

const inputFilePath = process.argv[2];
const ourputFilePath = process.argv[3];
const inPlace = process.argv.includes("-ip");

if (!inputFilePath) {
  usage_error();
  process.exit(1);
}

const parsedModel = await parseModelFile(inputFilePath);
const jsonModel = await convertSCTXtoSchema(parsedModel, inputFilePath);

if (inPlace) {
  console.log("Saving to", inputFilePath.replace(".sctx", ".json"));
  writeFileSync(
    inputFilePath.replace(".sctx", ".json"),
    JSON.stringify(jsonModel, null, 2),
  );
} else if (ourputFilePath) {
  console.log("Saving to", ourputFilePath);
  writeFileSync(ourputFilePath, JSON.stringify(jsonModel, null, 2));
} else {
  console.log(JSON.stringify(jsonModel, null, 2));
}
