import json
import subprocess
from pathlib import Path
from typing import Any

import requests

URL = "http://localhost:19339"
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
    # Resolve relative paths against the project root
    if jar_path and not Path(jar_path).is_absolute():
        jar_path = str(PROJECT_ROOT / jar_path)
    return jar_path


def load_model(name: str) -> list[dict[str, Any]]:
    json_path = BASE_DIR / "json" / f"{name}.json"

    if json_path.exists():
        with open(json_path) as f:
            return json.load(f)

    sctx_path = BASE_DIR / "sctx" / f"{name}.sctx"
    jar_path = get_java_jar_path()

    if not jar_path:
        raise FileNotFoundError("KiCo Jar not found\n")

    if not sctx_path.exists():
        raise FileNotFoundError(
            f"Model file not found: {json_path}\n"
            f"No source .sctx file found at {sctx_path} and no JAR configured.\n"
            f"Set 'java_jar_path' in {CONFIG_FILE} to enable auto-generation."
        )

    result = subprocess.run(
        [
            "java",
            "-jar",
            jar_path,
            "-s",
            "de.cau.cs.kieler.sccharts.SCTXToJSON",
            "-o",
            str(json_path),
            str(sctx_path),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Failed to generate {json_path} using JAR at {jar_path}:\n{result.stderr}"
        )

    with open(json_path) as f:
        return json.load(f)


class TestRunner:
    __test__ = False

    def __init__(self, name: str):
        self.name = name
        self.model = load_model(name)

    def setup(self) -> requests.Response:
        resp = requests.post(f"{URL}/setup", json={"model": self.model})
        assert resp.status_code == 200, (
            f"{resp.status_code}, Setup failed for {self.name}: {resp.text}"
        )
        return resp

    def run(self, inputs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        resp = requests.get(f"{URL}/reset")
        assert resp.status_code == 200, (
            f"{resp.status_code}, Reset failed for {self.name}: {resp.text}"
        )

        output = []
        for i, inp in enumerate(inputs):
            resp = requests.post(f"{URL}/tick", json={"inputs": inp})
            assert resp.status_code == 200, (
                f"{resp.status_code}, Tick {i} failed for {self.name}: {resp.text}"
            )
            output.append(resp.json())

            if resp.json().get("terminated"):
                break

        return output


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

    if not (exe_path.exists() and sctx_file.exists()):
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
