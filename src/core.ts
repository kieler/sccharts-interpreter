import express from "express";
import { validateSCChart, findInitalState } from "./schema/utils.js";
import type { SCChartModel } from "./schema/types.js";
import type { Context } from "./interpreter/types.js";
import { constructStateGraph } from "./interpreter/constructor.js";
import { tick } from "./interpreter/run.js";
import { clearMessages } from "./interpreter/errors.js";

const core = express();
core.use(express.json());

const wonly = process.argv.includes("-Wonly");

if (wonly) console.log("Warning-only mode enabled");

let chartModel: SCChartModel;
let globalContext: Context;

core.post("/setup", (req, res) => {
  const { model, temp_wonly } = req.body;
  if (temp_wonly) {
    console.log("Warning-only mode enabled");
  }
  try {
    const valid = validateSCChart(model);
    if (!valid)
      return res.status(400).json({ error: "Invaild SCChart Model JSON" });

    chartModel = model as SCChartModel;

    if (!findInitalState(chartModel))
      return res.status(400).json({ error: "No inital state in model" });

    globalContext = constructStateGraph(chartModel);
    globalContext.graph.activeNode = globalContext.graph.initalNode;
    if (temp_wonly == undefined)
      globalContext.errorMode = wonly ? "warnings-only" : "strict";
    else globalContext.errorMode = temp_wonly ? "warnings-only" : "strict";

    let variables: any = [];

    for (const variable of globalContext.variables) {
      variables.push({
        name: variable[0],
        type: globalContext.variableTypes.get(variable[0]) ?? "unknown",
        value: variable[1],
        isInput: globalContext.inputVariables.includes(variable[0]),
        isOutput: globalContext.outputVariables.includes(variable[0]),
      });
    }

    return res.status(200).json({
      message: "Setup successful",
      model: globalContext.model[0].label,
      variables: variables,
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
    tick(globalContext, inputs);
    const messages = globalContext.messages;
    clearMessages();
    globalContext.messages = [];
    return res.status(200).json({
      terminated: globalContext.graph.terminated,
      variables: Object.fromEntries(globalContext.variables),
      messages,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

core.get("/reset", (_, res) => {
  globalContext = constructStateGraph(chartModel);
  globalContext.graph.activeNode = globalContext.graph.initalNode;
  globalContext.errorMode = wonly ? "warnings-only" : "strict";

  return res.status(200).json({
    message: "Reset successful",
    model: globalContext.model[0].label,
  });
});

const PORT = process.env.PORT ?? 19339;

const server = core.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
