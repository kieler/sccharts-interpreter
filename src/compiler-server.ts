import cors from "cors";
import express from "express";
import { convertSCTX } from "./api/kico.js";

const compiler = express();
compiler.use(express.json());
compiler.use(cors());

// Health check endpoint
compiler.get("/health", (_req, res) => {
  return res.status(200).json({ status: "ok" });
});

// Compile endpoint - receives base64 sctx file and returns JSON model
compiler.post("/api/compile", async (req, res) => {
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

const PORT = process.env.PORT ?? 8080;

const server = compiler.listen(PORT, () => {
  console.log(`Compiler server running on http://localhost:${PORT}`);
});
