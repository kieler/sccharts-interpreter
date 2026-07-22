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
MODEL_PATH = Path(config.get("model_path", ""))


def pytest_generate_tests(metafunc):
    if "test_model" not in metafunc.fixturenames:
        return

    model_trace = []

    ktraces = [f.resolve() for f in MODEL_PATH.glob("**/*.ktrace")]
    for ktrace in ktraces:
        if ktrace.name in blocklist:
            continue
        elif (
            os.path.relpath(ktrace.parent, MODEL_PATH) in blocked_dirs
            or os.path.relpath(ktrace.parent.parent, MODEL_PATH) in blocked_dirs
            or os.path.relpath(ktrace.parent.parent.parent, MODEL_PATH) in blocked_dirs
        ):
            continue

        name = str(ktrace)[:-7]

        # For stuff where we have a model.sctx and model.1.ktrace or model-a.ktrace
        if name[-2] == "." or name[-2] == "-":
            name = name[:-2]

        model = Path(name + ".sctx")

        if model.exists():
            model_trace.append((model, ktrace))

    ids = [os.path.relpath(f[1], MODEL_PATH) for f in model_trace]
    metafunc.parametrize("test_model", model_trace, ids=ids)
