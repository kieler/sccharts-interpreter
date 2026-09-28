import json
import os
from pathlib import Path

from model_test_blocklist import blocked_dirs, blocklist

BASE_DIR = Path(__file__).resolve()
CONFIG_FILE = BASE_DIR.parent / "config.json"

if not CONFIG_FILE.exists():
    raise FileNotFoundError(f"Config file not found: {CONFIG_FILE}")

with open(CONFIG_FILE) as f:
    config = json.load(f)
# MODEL_PATH = Path(config.get("model_path", ""))
# DATAFLOW_MODEL_PATH = Path(config.get("dataflow_model_path", ""))


def pytest_generate_tests(metafunc):
    if "test_model" not in metafunc.fixturenames:
        return

    # Skip ktrace tests if --no-ktraces is set
    no_ktraces = os.environ.get("NO_KTRACES")

    if no_ktraces:
        model_trace = []
        ids = []
    else:
        model_trace = []
        ids = []

        for config_group in config:
            traces_in_path = []
            model_path = Path(config_group["model_path"])

            ktraces = [f.resolve() for f in model_path.glob("**/*.ktrace")]

            for ktrace in ktraces:
                if ktrace.name in blocklist or (
                    os.path.relpath(ktrace.parent, model_path) in blocked_dirs
                    or os.path.relpath(ktrace.parent.parent, model_path) in blocked_dirs
                    or os.path.relpath(ktrace.parent.parent.parent, model_path)
                    in blocked_dirs
                ):
                    continue

                name = str(ktrace)[:-7]

                # For stuff where we have a model.sctx and model.1.ktrace or model-a.ktrace
                if name[-2] == "." or name[-2] == "-":
                    name = name[:-2]

                model = Path(name + ".sctx")

                if model.exists():
                    traces_in_path.append((model, ktrace, config_group["prePass"]))

            ids += [os.path.relpath(f[1], model_path) for f in traces_in_path]
            model_trace += traces_in_path

    metafunc.parametrize("test_model", model_trace, ids=ids)
