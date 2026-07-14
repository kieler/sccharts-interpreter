import express from "express";

// TODO: "Port KiCo Server to v1"
// import { convertSCTX, generateDiagram } from "./api/kico.js";

const wonly = process.argv.includes("-Wonly");

if (wonly) {
  console.log("Warning-only mode enabled");
}

const server = express();
server.use(express.json());

const WEBUI_PORT = parseInt(process.env.WEBUI_PORT ?? "3001");
server.use(express.static("dist/web"));

const webui = server.listen(WEBUI_PORT, () => {
  console.log(`Web UI running on http://localhost:${WEBUI_PORT}`);
});

// TODO: "Port KiCo Server to v1"
// server.post("/api/create-diagram", async (req, res) => {
//   const { file, filename } = req.body as { file?: string; filename?: string };
//   if (!file || !filename) {
//     return res
//       .status(400)
//       .json({ type: "error", message: "Missing file or filename" });
//   }

//   const result = await generateDiagram(file, filename);

//   if (result.type === "png") {
//     return res.json({ type: "png", data: result.data });
//   } else {
//     return res.status(500).json({ type: "error", message: result.message });
//   }
// });
