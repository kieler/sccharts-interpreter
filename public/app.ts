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

import { setupContext, tick } from "web-interpreter";
import type { Context, TickResult } from "web-interpreter";

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
const inputHistory = document.getElementById(
  "input-json",
) as HTMLTextAreaElement;
const modelNameEl = document.getElementById("model-name") as HTMLHeadingElement;

let logVisible = false;
let tickCount = 0;
let context: Context | unknown;

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
  function helper(panel: HTMLDivElement) {
    for (let i = 0; i < panel.children.length; i++) {
      const name =
        panel.children[i].getElementsByClassName("name-element")[0].textContent;

      panel.children[i].getElementsByClassName("value-element")[0].textContent =
        context.variables.get(name);
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

  const allVars = new Set<string>();
  for (const v of context.variables.keys()) allVars.add(v);

  const varList = Array.from(allVars).sort();

  for (const name of varList) {
    const value = context.variables.get(name);
    const dataTyp = context.variableTypes.get(name) ?? "unknown";
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
      const model = JSON.parse(reader.result as string);
      if (!Array.isArray(model)) throw new Error("Expected array");
      log("[Init] Setting up context...");

      context = setupContext(model, false) as Context;

      log(`[OK] Model "${context.label}" loaded successfully.`);
      modelNameEl.textContent = `Model: ${context.label}`;

      renderModel(context as Context);
      logVariables(Object.fromEntries(context.variables), 0);

      tickButton.disabled = false;
    } catch (err) {
      log(`${(err as Error).message}`, "error");
      console.error(err);
    }
  };
  outputHistory.textContent = "";
  reader.readAsText(file);
});

function getInputJson(): string {
  if (inputHistory.value.trim() === "") return "{}";
  return inputHistory.value;
}

tickButton.addEventListener("click", () => {
  if (context.terminated) return;

  tickCount += 1;
  try {
    const inputs = getInputJson();
    const result: TickResult = tick(context, JSON.parse(inputs));

    logVariables(result.variables, tickCount);
    updateVariables(context);
    if (result.terminated) {
      tickButton.disabled = true;
      logTermination(tickCount);
    }
  } catch (err) {
    log(`${(err as Error).message}`, "error");
    console.error(err);
  }
});
