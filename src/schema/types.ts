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
  history: boolean;
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
  isConnector: boolean;
  regions: Region[];
  references: Reference;
}

export interface Reference {
  targetID: string;
  targetFile: string;
  parameters: string[];
}

export type SCChartModel = State[];
