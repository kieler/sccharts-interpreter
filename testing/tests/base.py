import json
import os
import random
import subprocess
from pathlib import Path
from typing import Any

import requests

URL = "http://localhost:3001"
BASE_DIR = Path(__file__).parent.parent.resolve()
PROJECT_ROOT = BASE_DIR.parent
CONFIG_FILE = PROJECT_ROOT / "kico_config.json"


def get_java_jar_path() -> str:
    """Read the configured Java JAR path from kico_config.json."""
    if not CONFIG_FILE.exists():
        return ""
    with open(CONFIG_FILE) as f:
        config = json.load(f)
    jar_path = config.get("java_jar_path", "")

    if jar_path and not Path(jar_path).is_absolute():
        jar_path = str(PROJECT_ROOT / jar_path)
    return jar_path


def load_model_name(name: str) -> list[dict[str, Any]]:
    json_path = BASE_DIR / "json" / f"{name}.json"

    return load_model(json_path, "sctx")


def load_model(path: Path, sctx_dir: str = "") -> list[dict[str, Any]]:
    if not os.environ.get("FORCE_RESET") and path.exists():
        with open(path) as f:
            return json.load(f)

    if sctx_dir != "":
        sctx_path = path.parent.parent / sctx_dir / f"{path.stem}.sctx"
    else:
        sctx_path = path.parent / f"{path.stem}.sctx"

    compile_sctx_to_json(sctx_path, path)

    with open(path) as f:
        return json.load(f)


def compile_sctx_to_json(sctx_path: Path, output_path: Path | None = None):
    jar_path = get_java_jar_path()

    if not jar_path:
        raise FileNotFoundError("KiCo Jar not found\n")

    result = subprocess.run(
        [
            "java",
            "-jar",
            jar_path,
            "-s",
            "de.cau.cs.kieler.sccharts.SCTXToJSON",
            "-o",
            str(sctx_path.with_suffix(".json"))
            if output_path is None
            else output_path.with_suffix(".json"),
            str(sctx_path),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Failed to compile {sctx_path} using JAR at {jar_path}:\n{result.stderr}"
        )


class TestRunner:
    __test__ = False

    def __init__(self, name: str, path: Path | None = None):
        self.name = name
        if path is not None:
            self.model = load_model(path)
        else:
            self.model = load_model_name(name)

    def setup(self, wonly=False, seed: int = 42) -> requests.Response:
        self.random = random.Random(seed)

        resp = requests.post(
            f"{URL}/setup", json={"model": self.model, "temp_wonly": wonly}
        )

        if resp.status_code == 500 and resp.json()["reference"]:
            compile_sctx_to_json(
                Path(resp.json()["reference"][5:])
            )  # string starts with file:

            resp2 = requests.post(
                f"{URL}/setup", json={"model": self.model, "temp_wonly": wonly}
            )

            assert resp2.status_code == 200, (
                f"{resp.status_code}, Setup failed for {self.name}: {resp.text}"
            )
            return resp2

        assert resp.status_code == 200, (
            f"{resp.status_code}, Setup failed for {self.name}: {resp.text}"
        )
        return resp

    def add_random_inputs(
        self,
        inputs: list[dict[str, Any]],
        type: str,
        name: str,
        n: int,
        number_range: tuple[int, int] | tuple[float, float] | None = None,
    ) -> list[dict[str, Any]]:
        if len(inputs) < n:
            inputs.extend([{} for _ in range(n - len(inputs))])
        temp = self.__random_input(type, name, n, number_range=number_range)
        for i in range(n):
            inputs[i][name] = temp[i][name]
        return inputs

    def __random_input(
        self,
        type: str,
        name: str,
        n: int,
        number_range: tuple[int, int] | tuple[float, float] | None = None,
    ) -> list[dict[str, Any]]:
        match type:
            case "int":
                if number_range is None:
                    raise ValueError("number_range must be specified for int type")
                return [
                    {
                        name: self.random.randint(
                            int(number_range[0]), int(number_range[1])
                        )
                    }
                    for _ in range(n)
                ]
            case "float":
                if number_range is None:
                    raise ValueError("number_range must be specified for float type")
                return [
                    {name: self.random.uniform(number_range[0], number_range[1])}
                    for _ in range(n)
                ]
            case "bool":
                return [{name: self.random.choice([True, False])} for _ in range(n)]
            case _:
                return []

    def run(self, inputs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        output = []
        for _, inp in enumerate(inputs):
            resp = requests.post(f"{URL}/tick", json={"inputs": inp})

            output.append(resp.json())
            if resp.status_code == 200:
                output[-1]["status"] = "fine"
            elif resp.status_code == 500:
                output[-1]["status"] = "error"
                break
            else:
                output[-1]["status"] = "unknown"

            if resp.json().get("terminated"):
                break

        return output

    def reset(self):
        resp = requests.get(f"{URL}/reset")
        assert resp.status_code == 200, (
            f"{resp.status_code}, Reset failed for {self.name}: {resp.text}"
        )


def assert_subset(actual: list[dict[str, Any]], expected: list[dict[str, Any]]) -> None:
    """Assert actual matches expected as a subset (extra fields in actual ignored).
    Extra trailing empty dicts in either list are silently allowed.
    This is because of the differing behaviour of the interpreter cli and the KiCo simulation cli, which continues even if the model is terminated.
    """
    for item in actual[len(expected) :]:
        assert item["variables"] == {}, (
            f"Length mismatch: extra step(s) in actual with content: {item}"
        )
    for item in expected[len(actual) :]:
        assert item["variables"] == {}, (
            f"Length mismatch: extra step(s) in expected with content: {item}"
        )
    for i, (a, e) in enumerate(zip(actual, expected)):
        assert set(e.keys()).issubset(set(a.keys())), (
            f"Step {i}: expected keys not subset of actual: {e.keys()}"
        )
        for k, v in e.items():
            if isinstance(v, dict):
                assert isinstance(a[k], dict), f"Step {i}: {k} is not a dict"
                _assert_subset_dict(a[k], v, f"step {i}.{k}")
            else:
                assert a[k] == v, f"Step {i}.{k}: expected {v}, got {a[k]}"


def _assert_subset_dict(
    actual: dict[str, Any], expected: dict[str, Any], prefix: str
) -> None:
    for k, v in expected.items():
        full_key = f"{prefix}.{k}"
        assert k in actual, f"{full_key}: key missing"
        if isinstance(v, dict):
            assert isinstance(actual[k], dict), f"{full_key} is not a dict"
            _assert_subset_dict(actual[k], v, full_key)
        else:
            assert actual[k] == v, f"{full_key}: expected {v}, got {actual[k]}"


def generate_expected(
    name: str,
    inputs: list[dict[str, Any]],
    variables: list[str],
    jar_path: str | None = None,
    sctx_dir: Path | None = None,
) -> list[dict[str, Any]]:
    """Run kico.jar compiled model tick-by-tick and return filtered outputs.

    Compiles the .sctx file to an ELF executable (stored at <BASE_DIR>/exe/<name>),
    feeds each input via stdin and parses JSON output from stdout,
    then writes the expected output as JSON to <output_dir>/<name>.json (if output_dir is set).

    Usage in tests:
        # Generate expected output without saving to file
        expected = generate_expected("ABO", inputs, ["A", "B", "O1", "O2"])
        assert runner.run(inputs) == expected
    """
    exe_cache_dir = BASE_DIR / "exe"
    exe_path = exe_cache_dir / f"{name}.exe"

    if jar_path is None:
        jar_path = get_java_jar_path()

    sctx_file = (sctx_dir or (BASE_DIR / "sctx")) / f"{name}.sctx"

    if not exe_path.exists() or os.environ.get("FORCE_RESET"):
        if not jar_path:
            raise FileNotFoundError(
                f"Java JAR not configured in {CONFIG_FILE}. "
                f"Set 'java_jar_path' or place a compiled {exe_cache_dir}/{name}.exe"
            )
        if not sctx_file.exists():
            raise FileNotFoundError(
                f"Source .sctx file not found at {sctx_file} and no JAR configured."
            )
        exe_cache_dir.mkdir(parents=True, exist_ok=True)
        result = subprocess.run(
            [
                "java",
                "-jar",
                jar_path,
                "-s",
                "de.cau.cs.kieler.sccharts.simulation.netlist.c",
                "-o",
                str(exe_path),
                str(sctx_file),
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"Failed to compile {name} using JAR at {jar_path}:\n{result.stderr}"
            )

    proc = subprocess.Popen(
        [str(exe_path)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    assert proc.stdin is not None
    assert proc.stdout is not None

    # Discard initial state output
    proc.stdout.readline()

    outputs: list[dict[str, Any]] = []
    for i, inp in enumerate(inputs):
        try:
            proc.stdin.write(json.dumps(inp) + "\r\n")
            proc.stdin.flush()
            line = proc.stdout.readline()

            if not line:
                break

            result = json.loads(line)

        except (json.JSONDecodeError, BrokenPipeError) as e:
            raise RuntimeError(f"Failed to process tick {i} for '{name}': {e}") from e

        terminated = result.get("_TERM", result.get("terminated", False))
        outputs.append(
            {
                "terminated": terminated,
                "variables": {v: result.get(v) for v in variables},
            }
        )

        if terminated:
            break

    try:
        proc.stdin.close()
        proc.wait(timeout=10)
    except Exception:
        proc.kill()
        proc.wait()

    return outputs
