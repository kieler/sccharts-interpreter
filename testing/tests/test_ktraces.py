import os
from pathlib import Path

from tests.base import TestRunner
from tests.utils import assert_subset, parse_ktrace


def test_model_with_ktrace(test_model: tuple[str, str]):
    with open(test_model[1]) as f:
        ktrace = f.read()

    trace = parse_ktrace(ktrace)

    model_inputs = []
    model_outputs = []
    j = 0
    for i in range(len(trace["inputs"])):
        if trace["inputs"][i] == {"reset": True}:
            model_inputs.append(trace["inputs"][j:i])
            model_outputs.append(trace["outputs"][j:i])
            j = i + 1

    model_inputs.append(trace["inputs"][j:])
    model_outputs.append(trace["outputs"][j:])

    for model_input, model_output in zip(model_inputs, model_outputs):
        sctx_path = Path(test_model[0])
        if os.environ.get("USE_LANGIUM", "false").lower() == "true":
            json_name = f"langium_{sctx_path.stem}.json"
        else:
            json_name = f"{sctx_path.stem}.json"
        json_path = sctx_path.parent / json_name

        runner = TestRunner(json_path)

        output = runner.run(inputs=model_input)

        expected_ouputs = [{"variables": vars} for vars in model_output]

        assert_subset(output, expected_ouputs)
