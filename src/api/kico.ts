import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const KICO_CONFIG_PATH = path.join(PROJECT_ROOT, "kico_config.json");
const OUTPUT_DIR = "/tmp/sccharts-compiler";

export interface ConvertResult {
  type: "json" | "error";
  data?: unknown;
  message?: string;
  inputPath?: string;
  outputPath?: string;
}

function readConfig() {
  if (!fs.existsSync(KICO_CONFIG_PATH)) return null;
  const raw = fs.readFileSync(KICO_CONFIG_PATH, "utf-8");
  return JSON.parse(raw) as { java_jar_path: string };
}

export async function convertSCTX(sctxBase64: string, filename: string): Promise<ConvertResult> {
  const config = readConfig();
  if (!config?.java_jar_path) {
    return { type: "error", message: "Kico.jar not configured — set java_jar_path in kico_config.json" };
  }

  let jarPath = config.java_jar_path;
  if (!path.isAbsolute(jarPath)) {
    jarPath = path.join(PROJECT_ROOT, jarPath);
  }

  if (!fs.existsSync(jarPath)) {
    return { type: "error", message: `Java JAR not found: ${jarPath}` };
  }

  const id = crypto.randomUUID();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const inputPath = path.join(OUTPUT_DIR, `${id}.sctx`);
  const outputPath = path.join(OUTPUT_DIR, `${id}.json`);

  const decoded = Buffer.from(sctxBase64, "base64");
  fs.writeFileSync(inputPath, decoded);

  return new Promise<ConvertResult>((resolve) => {
    const timeout = setTimeout(() => {
      cleanup(inputPath, outputPath);
      resolve({ type: "error", message: `Compilation timed out after 60s` });
    }, 60_000);

    execFile(
      "java",
      [
        "-jar",
        jarPath,
        "-s",
        "de.cau.cs.kieler.sccharts.SCTXToJSON",
        "-o",
        outputPath,
        inputPath,
      ],
      { timeout: 60_000 },
      (err, stdout, stderr) => {
        clearTimeout(timeout);

        if (err || stderr) {
          cleanup(inputPath, outputPath);
          const msg = stderr || err?.message || "Compilation failed with unknown error";
          resolve({ type: "error", message: msg });
          return;
        }

        if (!fs.existsSync(outputPath)) {
          cleanup(inputPath, outputPath);
          resolve({ type: "error", message: "kico.jar produced no output file" });
          return;
        }

        const outputRaw = fs.readFileSync(outputPath, "utf-8");
        let parsed: unknown;
        try {
          parsed = JSON.parse(outputRaw);
        } catch (e) {
          cleanup(inputPath, outputPath);
          resolve({ type: "error", message: `Invalid JSON output from kico.jar:\n${outputRaw}` });
          return;
        }

        const result: ConvertResult = { type: "json", data: parsed, inputPath, outputPath };
        console.log(`kico convert: ${filename} → ${outputPath}`);
        resolve(result);
      },
    );
  });
}

function cleanup(...files: string[]) {
  for (const f of files) {
    try { fs.rmSync(f, { force: true }); } catch {}
  }
}
