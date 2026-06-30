const connectionStatus = document.getElementById("connection-status");
const uploadSection = document.getElementById("upload-section");
const tickSection = document.getElementById("tick-section");
const outputSection = document.getElementById("output-section");
const fileInput = document.getElementById("file-input");
const setupStatus = document.getElementById("setup-status");
const tickInput = document.getElementById("tick-input");
const advanceTickBtn = document.getElementById("advance-tick-btn");
const autoRunBtn = document.getElementById("auto-run-btn");
const autoIntervalInput = document.getElementById("auto-interval");
const resetBtn = document.getElementById("reset-btn");
const clearOutputBtn = document.getElementById("clear-output-btn");
const tickOutput = document.getElementById("tick-output");
const consoleLogs = document.getElementById("console-logs");

let modelData = null;
let isConfigured = false;
let tickCount = 0;
let stopRequested = false;
let currentTickIndex = -1;
let inputList = [];

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

// Safe error string formatting that handles objects gracefully
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

function arrayBufferToBase64(buffer) {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function showStatus(el, text, type) {
	el.textContent = text;
	el.className = "status " + type;
}

showStatus(setupStatus, "", "checking");
setupStatus.style.display = "none";

async function checkConnection() {
	log("Checking core connection...");
	try {
		const resp = await fetch("/api/status", {
			signal: AbortSignal.timeout(5000),
		});
		const data = await resp.json();
		log("Connection check response: " + JSON.stringify(data));
		if (data.status === "connected") {
			showStatus(connectionStatus, "Core server connected", "connected");
			uploadSection.style.display = "flex";
			return;
		}
		throw new Error("not connected: " + JSON.stringify(data));
	} catch (err) {
		logWarn("Connection check failed: " + err.message);
		showStatus(connectionStatus, "Waiting for core server...", "disconnected");
		setTimeout(checkConnection, 3000);
	}
}

fileInput.addEventListener("change", (e) => {
	const file = e.target.files[0];
	log("File selected: " + file?.name);

	if (!file) return;

	const isSCTX = file.name.endsWith(".sctx");
	const reader = new FileReader();
	reader.onload = async () => {
		setupStatus.style.display = "block";

		if (isSCTX) {
			try {
				log("Converting .sctx with Kico...");
				showStatus(setupStatus, "Compiling with Kico...", "checking");

				const base64 = arrayBufferToBase64(reader.result);
				log("Request body (" + base64.length + " bytes) for /api/convert-scr");

				const resp = await fetch("/api/convert-scr", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ file: base64, filename: file.name }),
				});

				log("Convert response status: " + resp.status);

				if (!resp.ok) {
					let errBody;
					try {
						errBody = await resp.json();
						logError("Convert error JSON: " + JSON.stringify(errBody));
					} catch {
						const text = await resp.text().catch(() => "Could not read");
						logError("Convert error text: " + text);
						errBody = text;
					}
					showStatus(setupStatus, "Compilation failed: " + toErrorString(errBody), "error");
					return;
				}

				const result = await resp.json();
				log("Kico conversion successful!");
				modelData = result.data;

				showStatus(setupStatus, "Converting to JSON... done — setting up...", "checking");
				await doSetup(modelData);

			} catch (err) {
				logError("Kico conversion failed: " + err.message);
				showStatus(setupStatus, "Compilation failed: " + toErrorString(err), "error");
				modelData = null;
			}
		} else {
			// .json: parse locally and auto-setup
			try {
				log("Parsing JSON from file...");
				modelData = JSON.parse(reader.result);
				showStatus(setupStatus, "Loading model...", "checking");
				log("Model parsed: " + Object.keys(modelData).join(", "));

				await doSetup(modelData);
			} catch (err) {
				logError("Invalid JSON file: " + err.message);
				showStatus(
					setupStatus,
					"Invalid JSON file: " + toErrorString(err),
					"error",
				);
				setupStatus.style.display = "block";
				modelData = null;
				setupBtn.disabled = false;
			}
		}
	};
	reader.onerror = () => {
		logError("FileReader error: could not read file");
	};

	if (isSCTX) {
		reader.readAsArrayBuffer(file);
	} else {
		reader.readAsText(file);
	}
});

async function doSetup(data) {
	const payload = JSON.stringify({ model: data });
	log(
		"Request body (" +
			payload.length +
			" bytes): " +
			payload.substring(0, 300) +
			(payload.length > 300 ? "..." : ""),
	);

	const resp = await fetch("/api/setup", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: payload,
	});

	log("Setup response status: " + resp.status);

	if (!resp.ok) {
		let errBody;
		const ct = resp.headers.get("content-type") || "";
		try {
			errBody = await resp.json();
			logError("Setup error JSON: " + JSON.stringify(errBody));
		} catch {
			const text = await resp.text().catch(() => "Could not read");
			logError("Setup error text: " + text);
			errBody = text;
		}
		showStatus(setupStatus, "Setup failed: " + toErrorString(errBody), "error");
		modelData = null;
		return false;
	}

	const result = await resp.json();
	log("Response JSON body: " + JSON.stringify(result));
	log("Setup successful!");
	showStatus(
		setupStatus,
		"Setup successful — model: " + (result.model ?? "(unknown)"),
		"success",
	);
	isConfigured = true;
	tickSection.style.display = "flex";
	outputSection.style.display = "block";
	advanceTickBtn.disabled = false;
	autoRunBtn.disabled = false;
	return true;
}

checkConnection();

resetBtn.addEventListener("click", async () => {
	if (!isConfigured) return;

	log("--- Reset request ---");
	advanceTickBtn.disabled = true;
	advanceTickBtn.textContent = "Resetting...";
	stopRequested = false;
	autoRunBtn.textContent = "Auto Run";

	try {
		const resp = await fetch("/api/reset", {
			signal: AbortSignal.timeout(10_000),
		});

		log("Reset response status: " + resp.status);

		if (!resp.ok) {
			let errBody;
			try {
				errBody = await resp.json();
				logError("Reset error JSON: " + JSON.stringify(errBody));
			} catch {
				const text = await resp.text().catch(() => "Could not read");
				logError("Reset error text: " + text);
				errBody = text;
			}
			showStatus(
				setupStatus,
				"Reset failed: " + toErrorString(errBody),
				"error",
			);
			advanceTickBtn.disabled = false;
			advanceTickBtn.textContent = "Advance Tick";
			return;
		}

		const result = await resp.json();
		log("Reset successful — model: " + (result.model ?? "(unknown)"));
		showStatus(
			setupStatus,
			"Reset successful — model: " + (result.model ?? "(unknown)"),
			"success",
		);
		tickOutput.textContent = "No output yet.";
		consoleLogs.textContent = "";
		tickCount = 0;
		currentTickIndex = -1;
		inputList = [];
		stopRequested = false;
		autoRunBtn.textContent = "Auto Run";
		advanceTickBtn.disabled = false;
		advanceTickBtn.textContent = "Advance Tick";
	} catch (err) {
		logError("Reset error: " + err.message);
		showStatus(setupStatus, "Reset failed: " + toErrorString(err), "error");
		advanceTickBtn.disabled = false;
		advanceTickBtn.textContent = "Advance Tick";
	}
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
	} catch (err) {
		logError("Invalid input JSON: " + err.message);
		tickOutput.textContent += "\n\nError: Invalid input JSON — " + err.message;
		return null;
	}
}

async function runSingleTick(inputs, tickLabel) {
	const payload = JSON.stringify({ inputs });
	log(
		"Request body (" +
			payload.length +
			" bytes): " +
			payload.substring(0, 200) +
			(payload.length > 200 ? "..." : ""),
	);

	const resp = await fetch("/api/tick", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: payload,
	});

	log("Response status: " + resp.status);

	if (!resp.ok) {
		let errBody;
		const ct = resp.headers.get("content-type") || "";
		try {
			errBody = await resp.json();
			logError("Tick error JSON: " + JSON.stringify(errBody));
		} catch {
			const text = await resp.text().catch(() => "Could not read");
			logError("Tick error text: " + text);
			errBody = text;
		}
		return { success: false, error: toErrorString(errBody), terminated: false };
	}

	const result = await resp.json();
	log("Tick response: " + JSON.stringify(result));
	return { success: true, ...result, tickLabel };
}

async function executeTicks() {
	let baseInputs;
	try {
		baseInputs = JSON.parse(tickInput.value || "{}");
	} catch (err) {
		logError("Invalid input JSON: " + err.message);
		tickOutput.textContent = "Error: Invalid input JSON — " + err.message;
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

		autoRunBtn.textContent =
			"Stopping... (" + tickCount + "/" + inputs.length + ")";

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
	if (!isConfigured) return;

	const baseInputs = await parseAndValidateInput();
	if (baseInputs === null) return;

	const inputs = Array.isArray(baseInputs) ? baseInputs : [baseInputs];

	// If array, track position for step-through with wraparound
	let runIndex;
	if (inputs.length > 1) {
		inputList = inputs;
		currentTickIndex++;
		if (currentTickIndex >= inputs.length) currentTickIndex = 0;
		runIndex = currentTickIndex;
	} else {
		// Single item
		runIndex = 0;
		currentTickIndex = -1;
		inputList = [];
		tickCount++;
	}

	const tickLabel =
		inputs.length > 1 ? currentTickIndex + 1 + "/" + inputs.length : "";
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
		advanceTickBtn.textContent =
			inputs.length > 1 ? "Advance Tick" : "Advance Tick";
		return;
	}

	const lineLabel =
		inputs.length > 1 ? "[" + tickLabel + "]" : "[" + tickCount + "]";
	const line = lineLabel + " " + JSON.stringify(result.variables, null, 2);
	const terminated = result.terminated ? "\n\n[terminated]" : "";
	tickOutput.textContent +=
		(tickOutput.textContent.trim() === "" ||
		tickOutput.textContent.trim() === "No output yet."
			? ""
			: "\n\n") +
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
	if (!isConfigured) return;

	// If currently running, stop
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
