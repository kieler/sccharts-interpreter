import { readFileSync } from "node:fs";
import {
	validateSCChart,
	findInitalState,
	findInputVariables,
	findOutputVariables,
} from "./schema/utils.js";
import type { SCChartModel, Variable } from "./schema/types.js";

const filePath = process.argv[2];
if (!filePath) {
	console.error("Usage: npm start -- <path-to-sctx.json>");
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

try {
	const valid = validateSCChart(data);
	if (valid) {
		const model: SCChartModel = data as SCChartModel;
		const initalState = findInitalState(model);
		const inputVariables: Variable[] = findInputVariables(model);
		const outputVariables: Variable[] = findOutputVariables(model);

		if (!initalState) {
			console.error("No inital state in Model. Inital State required.");
			process.exit(1);
		}

		console.log("Model Name: " + model[0].label);
		console.log("Inital State: " + initalState.label);
		console.log(
			"Input Variables: " + inputVariables.map((v) => v.id).join(", "),
		);
		console.log(
			"Input Variables: " + outputVariables.map((v) => v.id).join(", "),
		);
	}
} catch (err) {
	const e = err as Error;
	console.error(e.message);
	process.exit(1);
}
