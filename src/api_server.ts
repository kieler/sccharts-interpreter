import express from "express";
import { validateSCChart } from "./schema/utils.js";
import type { SCChartModel } from "./schema/types.js";
import type { Context } from "./interpreter/types.js";
import { tick } from "./interpreter/run.js";
import { setupContext } from "./interpreter/utils.js";

const core = express();
core.use(express.json());

let chartModel: SCChartModel;
let globalContext: Context;
let wonly: boolean;

core.post("/setup", (req, res) => {
  const { model, temp_wonly } = req.body;
  wonly = temp_wonly;
  if (wonly) {
    console.log("Warning-only mode enabled");
  }
  try {
    const valid = validateSCChart(model);
    if (!valid)
      return res.status(400).json({ error: "Invaild SCChart Model JSON" });

    chartModel = model as SCChartModel;
    globalContext = setupContext(chartModel, wonly);

    return res.status(200).json({
      message: "Setup successful",
      model: globalContext.model[0].label,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : String(error) });
  }
});

core.post("/tick", (req, res) => {
  const { inputs } = req.body;
  try {
    const result = tick(globalContext, inputs);

    return res.status(200).json({
      terminated: result.terminated,
      variables: result.variables,
      messages: result.messages,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

core.get("/reset", (_, res) => {
  globalContext = setupContext(chartModel, wonly);

  return res.status(200).json({
    message: "Reset successful",
    model: globalContext.model[0].label,
  });
});

core.get("/ping", (_, res) => {
  return res.status(200).json({ message: "pong" });
});

core.get("/shutdown", (_, res) => {
  process.exit(0);
});

const PORT = process.env.PORT ?? 19339;

const server = core.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
