import express from "express";

const wonly = process.argv.includes("-Wonly");

if (wonly) {
  console.log("Warning-only mode enabled");
}

const server = express();
server.use(express.json());

const WEBUI_PORT = process.env.WEBUI_PORT ?? 19339;

server.use(express.static("dist/web"));

const webui = server.listen(WEBUI_PORT, () => {
  console.log(`Web UI running on http://localhost:${WEBUI_PORT}`);
});
