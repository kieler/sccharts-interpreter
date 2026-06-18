export interface Action {
  label?: string;
  type: "during" | "entry" | "exit";
  isImmediate: boolean;
  guard?: string;
  action: string;
}

export interface Transition {
  label?: string;
  targetID: string;
  isImmediate: boolean;
  preemption: "strong" | "weak" | "termination";
  guard?: string;
  action?: string;
}

export interface Variable {
  id: string;
  type: string;
  initialValue?: string | number | boolean;
  isInput: boolean;
  isOutput: boolean;
}

export interface Region {
  id: string;
  label?: string;
  states: State[];
}

export interface State {
  id: string;
  label?: string;
  actions: Action[];
  transitions: Transition[];
  variables: Variable[];
  isInitial: boolean;
  isFinal: boolean;
  regions: Region[];
}

export type SCChartModel = State[];
