import express from "express";
import { validateSCChart } from "./schema/utils.js";
import type { SCChartModel } from "./schema/types.js";
import type { Context, TickResult } from "./interpreter/types.js";
import { tick } from "./interpreter/run.js";
import { setupContext } from "./interpreter/utils.js";
import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import { createSCChartsServices } from "./grammar/sccharts-module.js";
import { preProcess, convertSCTXtoSchema } from "./converter/functions.js";
import { SCTX } from "./grammar/generated/ast.js";

const api = express();
api.use(express.json());

let chartModel: SCChartModel | undefined;
let globalContext: Context | undefined;

function badRequest(
  res: express.Response,
  msg: string,
  additional?: Record<string, unknown>,
) {
  const body: Record<string, unknown> = { error: msg };
  if (additional) Object.assign(body, additional);
  res.status(400).json(body);
}

function serverError(res: express.Response, msg: string) {
  res.status(500).json({ error: msg });
}

api.post("/setup", async (req, res) => {
  const body = req.body;
  if (!body || !body.format) return badRequest(res, "missing field: format");
  if (body.format !== "json" && body.format !== "sctx")
    return badRequest(res, `unknown format: '${String(body.format)}'`);

  let modelInput: SCChartModel | string;
  let filePath = typeof body.filePath === "string" ? body.filePath : undefined;

  if (body.format === "json") {
    if (!body.model)
      return badRequest(res, "missing field: model", { format: "json" });
    modelInput = body.model as SCChartModel;
  } else {
    // sctx
    if (!body.content)
      return badRequest(res, "missing field: content", { format: "sctx" });
    modelInput = body.content as string;
  }

  const wonly = Boolean(body.wonly);
  if (wonly) console.log("Warning-only mode enabled");

  let parsedModel: SCChartModel;

  try {
    if (body.format === "json") {
      if (!validateSCChart(modelInput as SCChartModel))
        return badRequest(
          res,
          "Failed to parse SCChart model: invalid JSON schema",
        );
      parsedModel = modelInput as SCChartModel;
    } else {
      const processed = preProcess(modelInput as string);
      const services = createSCChartsServices(EmptyFileSystem);
      const parse = parseHelper<SCTX>(services.SCCharts);
      const document = await parse(processed, { validation: true });

      if (
        document.parseResult.lexerErrors.length > 0 ||
        document.parseResult.parserErrors.length > 0
      ) {
        return badRequest(
          res,
          `Failed to parse SCChart model: ${document.parseResult.lexerErrors[0]?.message ?? "parser errors"}`,
        );
      }

      parsedModel = (await convertSCTXtoSchema(
        document.parseResult.value,
        filePath,
      )) as SCChartModel;
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("Local reference")) {
      return res.status(422).json({ error: err.message });
    }
    return serverError(
      res,
      `Failed to parse SCChart model: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  try {
    globalContext = setupContext(parsedModel, wonly, filePath);
    chartModel = parsedModel;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("Local reference")) {
      return res.status(422).json({ error: err.message });
    }
    return serverError(
      res,
      `Failed to setup model: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return res.status(200).json({
    message: "Setup successful",
    model: globalContext.model[0].label,
  });
});

api.post("/tick", (req, res) => {
  if (!globalContext)
    return badRequest(res, "No model loaded. Call /setup first.");

  const body = req.body ?? {};
  const inputs: Record<string, unknown> =
    typeof body.inputs === "object" && body.inputs !== null ? body.inputs : {};

  try {
    const result: TickResult = tick(globalContext, inputs);
    return res.status(200).json({
      terminated: result.terminated,
      variables: result.variables,
      messages: result.messages,
      telemetry: result.telemetry,
    });
  } catch (err: unknown) {
    console.error(err);
    return serverError(res, err instanceof Error ? err.message : String(err));
  }
});

api.post("/reset", (req, res) => {
  if (!globalContext || !chartModel)
    return badRequest(res, "No model loaded. Call /setup first.");

  try {
    globalContext = setupContext(chartModel, false, undefined);
  } catch (err: unknown) {
    return serverError(
      res,
      `Failed to reset model: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return res.status(200).json({
    message: "Reset successful",
    model: globalContext.model[0].label,
  });
});

api.get("/ping", (_, res) => res.status(200).json({ message: "pong" }));
api.get("/shutdown", (_req, res) => {
  res.status(200).json({ message: "Shutting down" });
  setTimeout(() => process.exit(0), 100);
});

const PORT = process.env.PORT ?? 19339;

const server = api.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
