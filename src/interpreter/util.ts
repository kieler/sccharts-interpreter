import { SCChartModel, State } from "../schema/types.js";
import { StateNode } from "./types.js";

export function isSuper(stateNode: StateNode): boolean {
  return stateNode.subgraphs !== undefined;
}

export function rootState(model: SCChartModel): State {
  return model[0];
}
