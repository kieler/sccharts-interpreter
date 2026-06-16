import { parseAction } from "./actionParser.js";
import { parseGuard } from "./guardParser.js";
import { Context } from "./types.js";
import { isSuper } from "./util.js";

export function run(context: Context, inputs: any) {
  // TODO: immediate transitions
  // The inital thing here is extremely janky, I need to rework that
  if (!context.graph.nodes[0].subgraphs) return;
  if (!context.graph.nodes[0].subgraphs[0].initalNode) return;

  context.activeNodes.add(context.graph.nodes[0].subgraphs[0].initalNode);

  for (const state of context.activeNodes) {
    console.log(state.id);
  }
  console.log();

  // "tick()"
  for (const input of inputs) {
    for (const variable in input) {
      context.variables.set(variable, input[variable]);
    }

    if (context.activeNodes.size === 0) return;

    for (const node of context.activeNodes) {
      let allDone = false;
      if (node.subgraphs) {
        allDone = node.subgraphs
          .flatMap((graph) => graph.terminated)
          .every((x) => x);
      }

      for (const edge of node.edgesOut) {
        // should the super state behaviour be more based on the termitaion preemtion? but also preemtion=termination only really makes sense for super states as far as I understand?
        if (
          (!edge.transition.guard ||
            parseGuard(edge.transition.guard, context.variables)) &&
          (!isSuper(node) || allDone)
        ) {
          if (edge.to) {
            if (edge.to.state.isFinal) {
              edge.to.graph.terminated = true;
            } else {
              context.activeNodes.add(edge.to);
              if (edge.to.subgraphs) {
                for (const subgraph of edge.to.subgraphs) {
                  if (!subgraph.initalNode) continue;
                  context.activeNodes.add(subgraph.initalNode);
                }
              }
            }
          }
          if (edge.transition.action)
            parseAction(edge.transition.action, context.variables);

          context.activeNodes.delete(node);
        }
      }
    }

    let output = "";
    for (const [key, value] of Object.entries(input)) {
      output += ", " + key + ": " + value;
    }
    for (const variable of context.outputVariables) {
      output += ", " + variable + ": " + context.variables.get(variable);
    }
    console.log(output);

    // for (const state of context.activeNodes) {
    //   console.log(state.id);
    // }
  }
}
