import { Ajv } from "ajv";
import sctxSchema from "../../sctx_schema.json" with { type: "json" };
import type { SCChartModel, State, Variable } from "./types.js";

const ajv = new Ajv({ strict: false, validateSchema: false });
const addFormatsModule = await import("ajv-formats");
type AddFormatsFn = (ajv: Ajv) => void;
const addFormats = addFormatsModule.default as unknown as AddFormatsFn;
addFormats(ajv);
const validate = ajv.compile(sctxSchema);

export function validateSCChart(data: unknown): data is SCChartModel {
	const valid = validate(data);
	if (!valid) {
		const errors =
			validate.errors
				?.map(
					(e: import("ajv").ErrorObject) => `${e.instancePath}: ${e.message}`,
				)
				.join("; ") || "Unknown error";
		throw new Error(`Validation failed: ${errors}`);
	}
	return valid;
}

export function findInitalState(states: State[]): State | undefined {
	for (const state of states) {
		if (state.isInitial) return state;
		const found = findInitalState(state.regions.flatMap((r) => r.states));
		if (found) return found;
	}
	return undefined;
}

export function findInputVariables(states: State[]): Variable[] {
	let inputVariables: Variable[] = [];

	for (const state of states) {
		for (const variable of state.variables) {
			if (variable.isInput) inputVariables.push(variable);
		}

		inputVariables = inputVariables.concat(
			findInputVariables(state.regions.flatMap((r) => r.states)),
		);
	}

	return inputVariables;
}

export function findOutputVariables(states: State[]): Variable[] {
	let outputVariables: Variable[] = [];

	for (const state of states) {
		for (const variable of state.variables) {
			if (variable.isOutput) outputVariables.push(variable);
		}

		outputVariables = outputVariables.concat(
			findOutputVariables(state.regions.flatMap((r) => r.states)),
		);
	}

	return outputVariables;
}
