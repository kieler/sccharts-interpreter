import cors from "cors";
import express from "express";
import { convertSCTX, generateDiagram } from "./api/kico.js";

const compiler = express();
compiler.use(express.json());
compiler.use(cors());

compiler.get("/ping", (_, res) => {
  return res.status(200).json({ message: "pong" });
});

compiler.get("/shutdown", (_, res) => {
  process.exit(0);
});

compiler.post("/compile", async (req, res) => {
  const { sctx_base64, filename } = req.body;

  if (!sctx_base64 || typeof sctx_base64 !== "string") {
    return res.status(400).json({ message: "Missing 'sctx_base64' field" });
  }

  const result = await convertSCTX(sctx_base64, filename || "unknown.sctx");

  if (result.type === "error") {
    return res.status(500).json({ type: "error", message: result.message });
  }

  return res.json({ type: "json", data: result.data });
});

compiler.post("/diagram", async (req, res) => {
  const { sctx_base64, filename } = req.body;

  if (!sctx_base64 || typeof sctx_base64 !== "string") {
    return res.status(400).json({ message: "Missing 'sctx_base64' field" });
  }

  const result = await generateDiagram(sctx_base64, filename);

  if (result.type === "error") {
    return res.status(500).json({ type: "error", message: result.message });
  }

  return res.json({ type: "json", data: result.data });
});

const PORT = process.env.PORT ?? 8080;

const server = compiler.listen(PORT, () => {
  console.log(`Compiler server running on http://localhost:${PORT}`);
});
