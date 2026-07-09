import { validateSCChart, constructStateGraph, tick } from "web-interpreter";
import type { SCChartModel, Context } from "web-interpreter";

const COMPILER_URL = "http://localhost:8080/api/compile";

const connectionStatus = document.getElementById("connection-status") as HTMLElement;
const modelPanel = document.getElementById("model-panel") as HTMLElement;
const uploadJsonBtn = document.getElementById("upload-json-btn") as HTMLButtonElement;
const uploadSctxBtn = document.getElementById("upload-sctx-btn") as HTMLButtonElement;
const showEditorBtn = document.getElementById("show-editor-btn") as HTMLButtonElement;
const jsonFileInput = document.getElementById("json-file-input") as HTMLInputElement;
const sctxFileInput = document.getElementById("sctx-file-input") as HTMLInputElement;
const editorContainer = document.getElementById("editor-container") as HTMLElement;
const editorContent = document.querySelectorAll(".editor-content");
const tickSection = document.getElementById("tick-section") as HTMLElement;
const outputSection = document.getElementById("output-section") as HTMLElement;
const sctxTextInput = document.getElementById("sctx-text-input") as HTMLTextAreaElement;
const compileModelBtn = document.getElementById("compile-model-btn") as HTMLButtonElement;
const textCompileStatus = document.getElementById("text-compile-status") as HTMLElement;
const tickInput = document.getElementById("tick-input") as HTMLTextAreaElement;
const advanceTickBtn = document.getElementById("advance-tick-btn") as HTMLButtonElement;
const autoRunBtn = document.getElementById("auto-run-btn") as HTMLButtonElement;
const autoIntervalInput = document.getElementById("auto-interval") as HTMLInputElement;
const resetBtn = document.getElementById("reset-btn") as HTMLButtonElement;
const clearOutputBtn = document.getElementById("clear-output-btn") as HTMLButtonElement;
const tickOutput = document.getElementById("tick-output") as HTMLPreElement;
const consoleLogs = document.getElementById("console-logs") as HTMLPreElement;

let modelData: SCChartModel | null = null;
let context: Context | null = null;
let isConfigured = false;
let editorVisible = false;
let tickCount = 0;
let stopRequested = false;
let currentTickIndex = -1;
let inputList: any[] = [];

function log(msg) {
	const time = new Date().toLocaleTimeString();
	const line = `[${time}] ${msg}\n`;
	console.log("[webui]", msg);
	if (consoleLogs) consoleLogs.textContent += line;
}

function logError(msg) {
	const time = new Date().toLocaleTimeString();
	const line = `[${time}] ERROR: ${msg}\n`;
	console.error("[webui]", msg);
	if (consoleLogs) consoleLogs.textContent += line;
}

function logWarn(msg) {
	const time = new Date().toLocaleTimeString();
	const line = `[${time}] WARN: ${msg}\n`;
	console.warn("[webui]", msg);
	if (consoleLogs) consoleLogs.textContent += line;
}

function toErrorString(val) {
	if (val == null) return "Unknown error";
	if (typeof val === "string") return val.trim();
	try {
		const str = JSON.stringify(val);
		if (
			str &&
			str !== "{}" &&
			!str.startsWith('{"message":null}') &&
			!str.startsWith('{"message":"null"}')
		) {
			return str;
		}
		return String(val);
	} catch {
		return String(val);
	}
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function showStatus(el: HTMLElement, text: string, type: string) {
	el.textContent = text;
	el.className = "status " + type;
}

function clearModelStatus() {
	textCompileStatus.style.display = "none";
	textCompileStatus.textContent = "";
}

function enableTickControls() {
	tickSection.style.display = "flex";
	outputSection.style.display = "block";
	advanceTickBtn.disabled = false;
	autoRunBtn.disabled = false;
}

// Show text editor panel
function showEditor() {
	editorVisible = true;
	sctxTextInput.value = "";
	clearModelStatus();
	modelPanel.classList.add("editor-visible");
	showEditorBtn.textContent = "⊖ Hide Text Editor";
	uploadSctxBtn.style.display = "inline-block";
	editorContent.forEach(el => el.style.opacity = "1");
}

function hideEditor() {
	editorVisible = false;
	modelPanel.classList.remove("editor-visible");
	showEditorBtn.textContent = "⊕ Show Text Editor";
	uploadSctxBtn.style.display = "none";
	editorContent.forEach(el => el.style.opacity = "0");
}

showStatus(connectionStatus, "Ready — JSON models load locally", "connected");
showEditorBtn.style.display = "inline-block";
uploadJsonBtn.style.display = "inline-block";

// Toggle editor visibility
showEditorBtn.addEventListener("click", () => {
	if (editorVisible) {
		hideEditor();
	} else {
		showEditor();
	}
});

uploadJsonBtn.addEventListener("click", () => {
	jsonFileInput.click();
});

uploadSctxBtn.addEventListener("click", () => {
	sctxFileInput.click();
});

jsonFileInput.addEventListener("change", (e) => {
	const file = (e.target as HTMLInputElement).files?.[0];
	log("JSON file selected: " + file?.name);
	if (!file) return;
	const reader = new FileReader();
	reader.onload = async () => {
		try {
			log("Parsing JSON from file...");
			modelData = JSON.parse(reader.result as string) as SCChartModel;
			showStatus(connectionStatus, "Loading model...", "checking");
			log("Model parsed: " + Object.keys(modelData).join(", "));
			const ok = await doSetup(modelData);
			if (!ok) {
				showStatus(connectionStatus, "Setup failed for JSON file", "error");
			} else {
				showStatus(connectionStatus, "JSON model loaded — model: " + (modelData ? Object.keys(modelData).join(", ") : "(unknown)"), "success");
			}
		} catch (err: unknown) {
			logError("Invalid JSON file: " + (err instanceof Error ? err.message : String(err)));
			showStatus(connectionStatus, "Invalid JSON file: " + toErrorString(err), "error");
			modelData = null;
		}
	};
	reader.readAsText(file);
	jsonFileInput.value = "";
});

sctxFileInput.addEventListener("change", (e) => {
	const file = (e.target as HTMLInputElement).files?.[0];
	log("SCTX file selected: " + file?.name);
	if (!file) return;
	// If editor is not visible, show message
	if (!editorVisible) {
		showStatus(connectionStatus, "Text editor not visible — toggle 'Show Text Editor' first", "error");
		return;
	}
	clearModelStatus();
	const reader = new FileReader();
	reader.onload = async () => {
		try {
			log("Reading .sctx file as text...");
			sctxTextInput.value = reader.result as string;
			sctxTextInput.dispatchEvent(new Event("input"));
			const ok = await compileAndLoadModel(reader.result as string);
			if (!ok) {
				showStatus(connectionStatus, "Failed to load model — upload JSON instead", "error");
			} else {
				showStatus(connectionStatus, "Model compiled and loaded from file", "success");
			}
		} catch (err: unknown) {
			logError(".sctx read error: " + (err instanceof Error ? err.message : String(err)));
			showStatus(connectionStatus, "Failed to read file: " + toErrorString(err), "error");
		}
	};
	reader.onerror = () => {
		logError("FileReader error: could not read file");
		showStatus(connectionStatus, "Failed to read file", "error");
	};
	reader.readAsText(file);
	sctxFileInput.value = "";
});

async function doSetup(data: SCChartModel): Promise<boolean> {
	const payload = JSON.stringify({ model: data });
	log(
		"Request body (" +
			payload.length +
			" bytes): " +
			payload.substring(0, 300) +
			(payload.length > 300 ? "..." : ""),
	);

	try {
		validateSCChart(data);
	} catch (err: unknown) {
		showStatus(connectionStatus, "Validation failed: " + toErrorString(err), "error");
		modelData = null;
		context = null;
		isConfigured = false;
		return false;
	}

	if (!data || data.length === 0) {
		showStatus(connectionStatus, "Setup failed: No states in model", "error");
		modelData = null;
		return false;
	}

	const hasInitial = findInitialRecursive(data);
	if (!hasInitial) {
		showStatus(connectionStatus, "Setup failed: No initial state in model", "error");
		modelData = null;
		return false;
	}

	context = constructStateGraph(data);
	context.graph.activeNode = context.graph.initalNode;
	modelData = data;
	isConfigured = true;

	log("Response JSON body: " + JSON.stringify({ model: data[0].label }));
	log("Setup successful!");
	enableTickControls();
	return true;
}

function findInitialRecursive(states: any[]): boolean {
	for (const state of states) {
		if (state.isInitial) return true;
		if (state.regions) {
			for (const region of state.regions) {
				if (findInitialRecursive(region.states)) return true;
			}
		}
	}
	return false;
}

sctxTextInput.addEventListener("input", () => {
	compileModelBtn.disabled = sctxTextInput.value.trim() === "";
});

async function compileAndLoadModel(text: string): Promise<boolean> {
	if (!text || !text.trim()) return false;

	clearModelStatus();
	textCompileStatus.style.display = "block";
	showStatus(textCompileStatus, "Compiling model...", "checking");
	compileModelBtn.disabled = true;
	compileModelBtn.textContent = "Compiling...";

	try {
		const encoder = new TextEncoder();
		const bytes = encoder.encode(text);
		const base64 = arrayBufferToBase64(bytes.buffer);

		log("Sending to compiler server: " + COMPILER_URL);

		const resp = await fetch(COMPILER_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ sctx_base64: base64, filename: "model.sctx" }),
		});

		if (!resp.ok) {
			let errBody: any;
			try {
				errBody = await resp.json();
				logError("Compile error JSON: " + JSON.stringify(errBody));
			} catch {
				const t = await resp.text().catch(() => "Could not read");
				logError("Compile error text: " + t);
				errBody = t;
			}
			showStatus(textCompileStatus, "Compiler server not available — upload JSON instead", "error");
			showStatus(connectionStatus, "Compiler unavailable", "disconnected");
			return false;
		}

		const result = await resp.json() as { type: string; data?: unknown; message?: string };
		log("Text model compiled successfully!");

		if (result.type === "error") {
			showStatus(textCompileStatus, "Compilation failed: " + toErrorString(result.message), "error");
			return false;
		}

		modelData = result.data as SCChartModel;
		isConfigured = true;

		showStatus(textCompileStatus, "Compilation successful", "success");
		showStatus(connectionStatus, "Compiled and loaded from text", "success");

		const ok = await doSetup(modelData);
		if (!ok) {
			showStatus(textCompileStatus, "Setup failed after compilation", "error");
		} else {
			tickSection.style.display = "flex";
			outputSection.style.display = "block";
			advanceTickBtn.disabled = false;
			autoRunBtn.disabled = false;
		}
	} catch (err: unknown) {
		logError("Compilation failed — compiler server is not running: " + (err instanceof Error ? err.message : String(err)));
		showStatus(textCompileStatus, "Compiler server not available — upload JSON instead", "error");
		showStatus(connectionStatus, "Compiler unavailable — use JSON models", "disconnected");
		modelData = null;
		return false;
	}

	compileModelBtn.disabled = false;
	compileModelBtn.textContent = "Compile & Load";
	return true;
}

compileModelBtn.addEventListener("click", async () => {
	const text = sctxTextInput.value;
	if (!text.trim()) return;
	await compileAndLoadModel(text);
});

resetBtn.addEventListener("click", async () => {
	if (!isConfigured || !modelData) return;

	log("--- Reset request ---");
	advanceTickBtn.disabled = true;
	advanceTickBtn.textContent = "Resetting...";
	stopRequested = false;
	autoRunBtn.textContent = "Auto Run";

	context = constructStateGraph(modelData);
	context.graph.activeNode = context.graph.initalNode;

	log("Reset successful — model: " + (modelData ? Object.keys(modelData).join(", ") : "(unknown)"));
	showStatus(connectionStatus, "Model reset", "success");
	tickOutput.textContent = "No output yet.";
	consoleLogs.textContent = "";
	tickCount = 0;
	currentTickIndex = -1;
	inputList = [];
	stopRequested = false;
	autoRunBtn.textContent = "Auto Run";
	advanceTickBtn.disabled = false;
	advanceTickBtn.textContent = "Advance Tick";
});

clearOutputBtn.addEventListener("click", () => {
	log("Output cleared");
	tickOutput.textContent = "No output yet.";
	consoleLogs.textContent = "";
	tickCount = 0;
});

async function parseAndValidateInput() {
	try {
		return JSON.parse(tickInput.value || "{}");
	} catch (err: unknown) {
		logError("Invalid input JSON: " + (err instanceof Error ? err.message : String(err)));
		tickOutput.textContent += "\n\nError: Invalid input JSON — " + (err instanceof Error ? err.message : String(err));
		return null;
	}
}

async function runSingleTick(inputs: any, tickLabel: string) {
	const payload = JSON.stringify({ inputs });
	log(
		"Request body (" +
			payload.length +
			" bytes): " +
			payload.substring(0, 200) +
			(payload.length > 200 ? "..." : ""),
	);

	if (!context) {
		return { success: false, error: "No model loaded", terminated: false };
	}

	tick(context, inputs);
	log("Tick response: terminated=" + context.graph.terminated);
	return {
		success: true,
		terminated: context.graph.terminated,
		variables: Object.fromEntries(context.variables),
		tickLabel,
	};
}

async function executeTicks() {
	let baseInputs: any;
	try {
		baseInputs = JSON.parse(tickInput.value || "{}");
	} catch (err: unknown) {
		logError("Invalid input JSON: " + (err instanceof Error ? err.message : String(err)));
		tickOutput.textContent = "Error: Invalid input JSON — " + (err instanceof Error ? err.message : String(err));
		return false;
	}

	const inputs = Array.isArray(baseInputs) ? baseInputs : [baseInputs];

	if (inputs.length === 0) {
		logWarn("Empty input list — nothing to run");
		tickOutput.textContent = "No ticks to run.";
		return false;
	}

	log("--- Executing " + inputs.length + " tick(s) ---");
	let wasTerminated = false;
	tickCount = 0;

	for (let i = 0; i < inputs.length; i++) {
		if (stopRequested) {
			log("Auto-run stopped by user after #" + tickCount);
			break;
		}

		const input = inputs[i];
		tickCount++;
		const tickLabel = "[" + tickCount + "/" + inputs.length + "]";
		log("--- Tick " + tickLabel + " ---");
		log("Input: " + JSON.stringify(input));

		autoRunBtn.textContent = "Stopping... (" + tickCount + "/" + inputs.length + ")";

		const result = await runSingleTick(input, tickLabel);

		if (!result.success) {
			tickOutput.textContent += "\n\n" + tickLabel + " Error: " + result.error;
			logError("Tick " + tickLabel + " failed: " + result.error);
			break;
		}

		const line = tickLabel + " " + JSON.stringify(result.variables, null, 2);
		const terminated = result.terminated ? "\n\n[terminated]" : "";
		tickOutput.textContent +=
			(tickCount === 1 && tickOutput.textContent.trim() === "" ? "" : "\n\n") +
			line +
			terminated;

		if (result.terminated) {
			log("Model terminated!");
			wasTerminated = true;
			autoRunBtn.textContent = "Stopped (terminated)";
			break;
		}

		const interval = Math.max(50, parseInt(autoIntervalInput.value) || 300);
		if (i < inputs.length - 1 && !stopRequested) {
			await new Promise((resolve) => setTimeout(resolve, interval));
		}
	}

	if (!wasTerminated && !stopRequested) {
		log("All " + tickCount + " ticks completed");
		autoRunBtn.textContent = "Auto Run";
	}

	return wasTerminated;
}

advanceTickBtn.addEventListener("click", async () => {
	if (!isConfigured || !context) return;

	const baseInputs = await parseAndValidateInput();
	if (baseInputs === null) return;

	const inputs = Array.isArray(baseInputs) ? baseInputs : [baseInputs];

	let runIndex: number;
	if (inputs.length > 1) {
		inputList = inputs;
		currentTickIndex++;
		if (currentTickIndex >= inputs.length) currentTickIndex = 0;
		runIndex = currentTickIndex;
	} else {
		runIndex = 0;
		currentTickIndex = -1;
		inputList = [];
		tickCount++;
	}

	const tickLabel = inputs.length > 1 ? currentTickIndex + 1 + "/" + inputs.length : "";
	const input = inputs[runIndex];
	const label = inputs.length > 1 ? "[" + tickLabel + "]" : "[]";
	log("--- Tick " + label + " ---");
	log("Input: " + JSON.stringify(input));
	advanceTickBtn.disabled = true;
	advanceTickBtn.textContent =
		inputs.length > 1
			? "Advancing... [" + (currentTickIndex + 1) + "/" + inputs.length + "]"
			: "Advancing...";

	const result = await runSingleTick(input, label);

	if (!result.success) {
		tickOutput.textContent +=
			"\n\n[" +
			(inputs.length > 1 ? tickLabel : tickCount) +
			"] Error: " +
			result.error;
		advanceTickBtn.disabled = false;
		advanceTickBtn.textContent = "Advance Tick";
		return;
	}

	const lineLabel = inputs.length > 1 ? "[" + tickLabel + "]" : "[" + tickCount + "]";
	const line = lineLabel + " " + JSON.stringify(result.variables, null, 2);
	const terminated = result.terminated ? "\n\n[terminated]" : "";
	tickOutput.textContent +=
		(tickOutput.textContent.trim() === "" || tickOutput.textContent.trim() === "No output yet." ? "" : "\n\n") +
		line +
		terminated;

	if (result.terminated) {
		log("Model terminated!");
		advanceTickBtn.disabled = true;
		advanceTickBtn.textContent = "Terminated";
	} else if (inputs.length > 1) {
		advanceTickBtn.disabled = false;
		advanceTickBtn.textContent = "Advance Tick";
	} else {
		advanceTickBtn.disabled = false;
		advanceTickBtn.textContent = "Advance Tick";
	}
});

autoRunBtn.addEventListener("click", async () => {
	if (!isConfigured || !context) return;

	if (stopRequested) {
		stopRequested = false;
		log("Auto-run stopped");
		autoRunBtn.textContent = "Auto Run";
		advanceTickBtn.disabled = false;
		advanceTickBtn.textContent = "Advance Tick";
		return;
	}

	const baseInputs = await parseAndValidateInput();
	if (baseInputs === null) return;

	const inputs = Array.isArray(baseInputs) ? baseInputs : [baseInputs];

	if (inputs.length === 0) {
		logWarn("Empty input list — nothing to run");
		tickOutput.textContent = "No ticks to run.";
		return;
	}

	stopRequested = false;
	tickOutput.textContent = "";
	autoRunBtn.textContent = "Stop";
	advanceTickBtn.disabled = true;
	advanceTickBtn.textContent = "Blocked during auto-run";
	await executeTicks(inputs);
});
