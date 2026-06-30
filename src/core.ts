import express from "express";
import { validateSCChart, findInitalState } from "./schema/utils.js";
import type { SCChartModel } from "./schema/types.js";
import type { Context } from "./interpreter/types.js";
import { constructStateGraph } from "./interpreter/constructor.js";
import { tick } from "./interpreter/run.js";

const core = express();
core.use(express.json());

let chartModel: SCChartModel;
let globalContext: Context;

core.post("/setup", (req, res) => {
  const { model } = req.body;
  try {
    const valid = validateSCChart(model);
    if (!valid)
      return res.status(400).json({ error: "Invaild SCChart Model JSON" });

    chartModel = model as SCChartModel;

    if (!findInitalState(chartModel))
      return res.status(400).json({ error: "No inital state in model" });

    globalContext = constructStateGraph(chartModel);
    globalContext.graph.activeNode = globalContext.graph.initalNode;

    return res.status(200).json({
      message: "Setup successful",
      model: globalContext.model[0].label,
    });
  } catch (error) {
    return res.status(500).json({ error: error });
  }
});

core.post("/tick", (req, res) => {
  const { inputs } = req.body;
  try {
    tick(globalContext, inputs);
    return res.status(200).json({
      terminated: globalContext.graph.terminated,
      variables: Object.fromEntries(globalContext.variables),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

core.get("/reset", (_, res) => {
  globalContext = constructStateGraph(chartModel);
  globalContext.graph.activeNode = globalContext.graph.initalNode;

  return res.status(200).json({
    message: "Reset successful",
    model: globalContext.model[0].label,
  });
});

const PORT = process.env.PORT ?? 19339;

const server = core.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
