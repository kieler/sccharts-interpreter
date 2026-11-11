const logEl = document.getElementById("log") as HTMLPreElement;

export function log(message: string, level: "info" | "error" = "info") {
  const prefix = level === "error" ? "[ERROR]" : "";
  logEl.textContent += `${prefix} ${message}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

const originalLog = console.log.bind(console);
const originalError = console.error.bind(console);

console.log = (...args: unknown[]) => {
  log(
    args
      .map((a) =>
        typeof a === "object" ? JSON.stringify(a, null, 2) : String(a),
      )
      .join(" "),
  );
  originalLog(...args);
};

console.error = (...args: unknown[]) => {
  const text = args
    .map((a) =>
      typeof a === "object" ? JSON.stringify(a, null, 2) : String(a),
    )
    .join(" ");
  log(text, "error");
  originalError(text);
};

log("[System] Ready.");

import {
  setupContext,
  tick,
  preProcess,
  convertSCTXtoSchema,
  createSCChartsServices,
  getVariable,
  getVariableType,
} from "web-interpreter";
import type { Context, TickResult, SCChartModel, SCTX } from "web-interpreter";

import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";

const fileInput = document.getElementById("json-file") as HTMLInputElement;

const toggleBtn = document.getElementById("toggle-log") as HTMLButtonElement;
const variablesPanel = document.getElementById(
  "model-variables",
) as HTMLDivElement;
const inputsPanel = document.getElementById("model-input") as HTMLDivElement;
const outputsPanel = document.getElementById(
  "model-output-list",
) as HTMLDivElement;
const outputHistory = document.getElementById(
  "output-history",
) as HTMLTextAreaElement;

const tickButton = document.getElementById("advance-tick") as HTMLButtonElement;
const autoRunButton = document.getElementById("auto-run") as HTMLButtonElement;
const loopInputsToggle = document.getElementById(
  "loop-inputs",
) as HTMLInputElement;
const timerSlider = document.getElementById("auto-timer") as HTMLInputElement;
const resetButton = document.getElementById("reset") as HTMLButtonElement;

const inputHistory = document.getElementById(
  "input-json",
) as HTMLTextAreaElement;
const modelNameEl = document.getElementById("model-name") as HTMLHeadingElement;

const sctxPanel = document.getElementById("model-sctx") as HTMLDivElement;

const sctxUploadButton = document.getElementById(
  "sctx-file",
) as HTMLButtonElement;
const sctxTextInput = document.getElementById(
  "scchart-textarea",
) as HTMLTextAreaElement;
const compileButton = document.getElementById(
  "compile-button",
) as HTMLButtonElement;
const diagramImage = document.getElementById(
  "diagram-image",
) as HTMLImageElement;

let logVisible = false;
let tickCount = 0;
let loopInputs = false;
let context: Context | unknown;
let scchartModel: SCChartModel | undefined;

function createVarCard(
  name: string,
  value: unknown,
  dataTyp: string,
  role: "Input" | "Output" | "Input+Output" | "Internal",
) {
  const card = document.createElement("div");
  card.className = "var-card";

  const nameEl = document.createElement("span");
  nameEl.classList = "label name-element";
  nameEl.textContent = name;

  const valueEl = document.createElement("span");
  valueEl.classList = "val value-element";
  valueEl.textContent = String(value);

  const typeEl = document.createElement("span");
  typeEl.className = "label";
  typeEl.textContent = dataTyp;

  const roleBadge = document.createElement("span");
  roleBadge.className = `role-badge role-${role === "Input" ? "inp" : role === "Output" ? "out" : role === "Input+Output" ? "io" : "int"}`;
  roleBadge.textContent = role;

  card.appendChild(nameEl);
  card.appendChild(valueEl);
  card.appendChild(typeEl);
  card.appendChild(roleBadge);
  return card;
}

function logVariables(variables: Record<string, unknown>, tick: number) {
  outputHistory.textContent = `${outputHistory.textContent} [${tick}] \t ${JSON.stringify(
    variables,
  )}\n`;
}

function logTermination(tick: number) {
  outputHistory.textContent = `${outputHistory.textContent} [${tick}] \t Terminated\n`;
}

function updateVariables(context: Context) {
  const initialNode = context.graph.initalNode!;
  function helper(panel: HTMLDivElement) {
    for (let i = 0; i < panel.children.length; i++) {
      const nameEl =
        panel.children[i].getElementsByClassName("name-element")[0];
      const name = nameEl ? String(nameEl.textContent || "") : "";
      if (!name) continue;

      const valueEl =
        panel.children[i].getElementsByClassName("value-element")[0];
      if (!valueEl) continue;

      // getVariable handles Variable | Variable[] and scope resolution
      const val = getVariable(name, initialNode, context);
      valueEl.textContent = val != null ? String(val) : "";
    }
  }
  helper(inputsPanel);
  helper(outputsPanel);
  helper(variablesPanel);
}

function renderModel(context: Context) {
  variablesPanel.innerHTML = "";
  inputsPanel.innerHTML = "";
  outputsPanel.innerHTML = "";

  const varNames = Array.from(context.variables.keys()).sort();
  const initialNode = context.graph.initalNode!;

  for (const name of varNames) {
    const value = getVariable(name, initialNode, context);
    const dataTyp = getVariableType(name, initialNode, context) ?? "unknown";
    const isInput = context.inputVariables.includes(name);
    const isOutput = context.outputVariables.includes(name);

    let role: "Input" | "Output" | "Input+Output" | "Internal";

    if (isInput && isOutput) role = "Input+Output";
    else if (isInput) role = "Input";
    else if (isOutput) role = "Output";
    else role = "Internal";

    const card = createVarCard(name, value, dataTyp, role);

    if (role === "Input") {
      inputsPanel.appendChild(card.cloneNode(true));
    } else if (role === "Output") {
      outputsPanel.appendChild(card);
    } else if (role === "Input+Output") {
      outputsPanel.appendChild(card.cloneNode(true));
      inputsPanel.appendChild(card.cloneNode(true));
    }

    if (role === "Internal") {
      variablesPanel.appendChild(card);
    }
  }
}

toggleBtn.addEventListener("click", () => {
  logVisible = !logVisible;
  logEl.style.display = logVisible ? "block" : "none";
  toggleBtn.textContent = logVisible ? "Hide Log" : "Show Log";
});

fileInput.addEventListener("change", (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  log(`[File] Loading: ${file.name}`);

  const reader = new FileReader();
  reader.onload = () => {
    try {
      scchartModel = JSON.parse(reader.result as string);
      loadModel(scchartModel);
    } catch (err) {
      log(`${(err as Error).message}`, "error");
      console.error(err);
    }
  };
  outputHistory.textContent = "";
  reader.readAsText(file);
});

function loadModel(model: SCChartModel) {
  outputHistory.textContent = "";

  if (!Array.isArray(model)) throw new Error("Expected array");
  log("[Init] Setting up context...");

  context = setupContext(model, false) as Context;

  log(`[OK] Model "${context.label}" loaded successfully.`);
  modelNameEl.textContent = `Model: ${context.label} (Last tick: — ms)`;

  renderModel(context as Context);

  const varsForLog: Record<string, unknown> = {};
  const initialNode = (context as Context).graph.initalNode!;
  for (const [name] of (context as Context).variables.entries()) {
    varsForLog[name] = getVariable(name, initialNode, context as Context);
  }
  logVariables(varsForLog, 0);

  tickButton.disabled = false;
  autoRunButton.disabled = false;
  loopInputsToggle.disabled = false;
  timerSlider.disabled = false;
  resetButton.disabled = false;
}

sctxUploadButton.addEventListener("change", (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  log(`[File] Loading: ${file.name}`);

  const reader = new FileReader();
  reader.onload = () => {
    try {
      sctxTextInput.value = reader.result as string;
      log(`[OK] File "${file.name}" loaded successfully.`);
    } catch (err) {
      log(`${(err as Error).message}`, "error");
      console.error(err);
    }
  };
  reader.readAsText(file);
});

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

compileButton.addEventListener("click", async () => {
  log("[Compiler] Compiling model...");
  const text = sctxTextInput.value;

  try {
    const model = preProcess(text);

    const services = createSCChartsServices(EmptyFileSystem);
    const parse = parseHelper<SCTX>(services.SCCharts);
    const document = await parse(model, { validation: true });

    if (
      document.parseResult.lexerErrors.length > 0 ||
      document.parseResult.parserErrors.length > 0
    ) {
      log(model, "error");
      log(String(document.parseResult.lexerErrors), "error");
      log(String(document.parseResult.parserErrors), "error");
      throw new Error("Lexer or Parser errors occurred");
    }

    const result = await convertSCTXtoSchema(document.parseResult.value, []);
    scchartModel = result;

    loadModel(result);
  } catch (err: any) {
    log(`[Compiler] Compilation failed: ${(err as Error).message}`, "error");
    return false;
  }
});

function getInputJson(): string {
  if (inputHistory.value.trim() === "") return "{}";
  return inputHistory.value;
}

function doTick(input: any): TickResult {
  tickCount += 1;

  const result: TickResult = tick(context, input);

  logVariables(result.variables, tickCount);
  updateVariables(context);

  // Update last tick time inline on model name
  if (result.telemetry && "ticktime" in result.telemetry) {
    const ticktime = Number(result.telemetry.ticktime);
    modelNameEl.textContent = `Model: ${context.label} (Last tick: ${ticktime} ms)`;
  }

  if (result.terminated) {
    tickButton.disabled = true;
    autoRunButton.disabled = true;
    timerSlider.disabled = true;
    loopInputsToggle.disabled = true;
    logTermination(tickCount);
  }
  return result;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

autoRunButton.addEventListener("click", async () => {
  if (context.terminated) return;

  async function loopHelper() {
    let inputs = JSON.parse(getInputJson());
    if (!Array.isArray(inputs)) {
      inputs = [inputs];
    }

    for (let i = 0; i < inputs.length; i++) {
      const result = doTick(inputs[i]);
      if (result.terminated) return;
      await sleep(Number(timerSlider.value));
    }
  }

  do {
    await loopHelper();
  } while (loopInputs && !context.terminated);
});

tickButton.addEventListener("click", () => {
  if (context.terminated) return;

  try {
    const inputs = JSON.parse(getInputJson());
    let input;
    if (Array.isArray(inputs)) {
      input = inputs[tickCount % inputs.length];
    } else {
      input = inputs;
    }

    doTick(input);
  } catch (err) {
    log(`${(err as Error).message}`, "error");
    console.error(err);
  }
});

loopInputsToggle.addEventListener("click", () => {
  loopInputs = !loopInputs;
  loopInputsToggle.innerHTML = loopInputs ? "✓ Loop Inputs" : "✖ Loop Inputs";
});

resetButton.addEventListener("click", () => {
  tickCount = 0;
  try {
    loadModel(scchartModel);
  } catch (err) {
    log(`${(err as Error).message}`, "error");
    console.error(err);
  }
});
