import express from "express";
import { convertSCTX } from "./api/kico.js";

const webui = express();
webui.use(express.json());

const WEBUI_PORT = parseInt(process.env.WEBUI_PORT ?? "3001");
const CORE_URL = process.env.CORE_URL ?? "http://localhost:19339";

webui.use(express.static("public"));

async function proxyRequest(method: string, targetPath: string, data?: unknown) {
  const url = `${CORE_URL}${targetPath}`;
  try {
    const fetchBody = data !== undefined ? JSON.stringify(data) : undefined;
    const resp = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: fetchBody,
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { status: resp.status, body: err };
    }

    const result = await resp.json();
    return { status: resp.status, body: result };
  } catch (err: unknown) {
    if ((err as Error).name === "TimeoutError" || (err as DOMException).code === 20) {
      return { status: 504, body: { error: "Core server timed out (10s)" } };
    }
    return { status: 503, body: { error: "Core server not reachable" } };
  }
}

webui.post("/api/setup", async (req, res) => {
  const result = await proxyRequest("POST", "/setup", req.body);
  res.status(result.status).json(result.body);
});

webui.post("/api/tick", async (req, res) => {
  const result = await proxyRequest("POST", "/tick", req.body);
  res.status(result.status).json(result.body);
});

webui.get("/api/reset", async (_, res) => {
  const result = await proxyRequest("GET", "/reset");
  res.status(result.status).json(result.body);
});

webui.get("/api/status", async (_, res) => {
  try {
    const resp = await fetch(`${CORE_URL}/setup`, { method: "GET", signal: AbortSignal.timeout(5_000) });
    if (resp.ok || resp.status === 404 || resp.status === 405) {
      return res.json({ status: "connected" });
    }
    return res.json({ status: "error", code: resp.status });
  } catch {
    return res.json({ status: "disconnected" });
  }
});

webui.post("/api/convert-scr", async (req, res) => {
  const { file, filename } = req.body as { file?: string; filename?: string };
  if (!file || !filename) {
    return res.status(400).json({ message: "Missing file or filename" });
  }

  const result = await convertSCTX(file, filename);

  if (result.type === "json") {
    return res.json({ type: "sctx-converted", data: result.data });
  } else {
    return res.status(500).json({ type: "error", message: result.message });
  }
});

const server = webui.listen(WEBUI_PORT, () => {
  console.log(`Web UI running on http://localhost:${WEBUI_PORT}`);
  console.log(`Proxying to core at ${CORE_URL}`);
});
