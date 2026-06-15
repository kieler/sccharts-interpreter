import { parseAction } from "./actionParser.js";
import { parseGuard } from "./guardParser.js";
import { Context } from "./types.js";

export function run(context: Context, inputs: any) {
	for (const node of context.graph.initalNodes) {
		context.activeStates.add(node);
	}

	for (const state of context.activeStates) {
		console.log(state.id);
	}
	console.log();

	// "tick()"
	for (const input of inputs) {
		for (const variable in input) {
			context.variables.set(variable, input[variable]);
		}

		for (const state of context.activeStates) {
			for (const edge of state.edgesOut) {
				if (!edge.guard || parseGuard(edge.guard, context.variables)) {
					if (edge.to) context.activeStates.add(edge.to);
					if (edge.action) parseAction(edge.action, context.variables);

					context.activeStates.delete(state);
				}
			}
		}

		console.log(context.variables);
		for (const state of context.activeStates) {
			console.log(state.id);
		}
		console.log();
	}
}
