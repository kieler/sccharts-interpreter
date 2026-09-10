import json
import os
import random
import subprocess
from pathlib import Path

from typing_extensions import Any

from tests.utils import generate_random_string

BASE_DIR = Path(__file__).parent.parent.resolve()
PROJECT_ROOT = BASE_DIR.parent
CONFIG_FILE = PROJECT_ROOT / "kico_config.json"


def _langium_mode() -> bool:
    return os.environ.get("LANGIUM") != None


def _reset_exe_mode() -> bool:
    return os.environ.get("FORCE_RESET_EXE") != None


def _reset_json_mode() -> bool:
    return os.environ.get("FORCE_RESET_JSON") != None


def _cache_langium_mode() -> bool:
    return os.environ.get("CACHE_LANGIUM_JSON") != None


def get_java_jar_path() -> str:
    """Read the configured Java JAR path from kico_config.json."""
    if not CONFIG_FILE.exists():
        return ""
    with open(CONFIG_FILE) as f:
        config: dict[str, str] = json.load(f)
    jar_path = config.get("java_jar_path", "")

    if jar_path and not Path(jar_path).is_absolute():
        jar_path = str(PROJECT_ROOT / jar_path)
    return jar_path


def run_npm(
    model_path: Path, inputs: list[dict[str, Any]], wonly: bool
) -> subprocess.CompletedProcess[str]:

    string_inputs = (
        str(inputs).replace("'", '"').replace("False", "false").replace("True", "true")
    )

    result = subprocess.run(
        [
            "npm",
            "run",
            "cli",
            "--",
            str(model_path),
            f"{'-Wonly' if wonly else ''}",
            "-i",
            f"{string_inputs}",
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    return result


class TestRunner:
    __test__: bool = False

    def __init__(self, model_path: Path | str, seed: int = 42, wonly: bool = False):
        self.jar_path: str = get_java_jar_path()
        if not self.jar_path or self.jar_path == "":
            raise FileNotFoundError("KiCo not found\n")

        self.random: random.Random = random.Random(42)
        if isinstance(model_path, str):
            model_path = Path(model_path).resolve()

        self.model_path: Path = model_path
        self.wonly: bool = wonly

        if not _langium_mode() or _cache_langium_mode():
            self.model_path = self.model_path.with_suffix(".json")

    def kico_compile_sctx_to_json(
        self, sctx_path: Path, output_path: Path | None = None
    ):
        """
        If the output path is not set, it defaults to save the json file
        in the same place as the sctx and with the same name
        """

        if not self.jar_path:
            raise FileNotFoundError("KiCo not found\n")

        result = subprocess.run(
            [
                "java",
                "-jar",
                self.jar_path,
                "-s",
                "de.cau.cs.kieler.sccharts.SCTXToJSON",
                "-o",
                str(sctx_path.with_suffix(".json"))
                if output_path is None
                else output_path,
                str(sctx_path),
            ],
            check=False,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            raise RuntimeError(
                f"Failed to compile {sctx_path} using JAR at {self.jar_path}:\n{result.stderr}"
            )

    def kico_compile_sctx_to_exe(
        self, sctx_path: Path, output_path: Path | None = None
    ):
        """
        If the output path is not set, it defaults to save the json file
        in the same place as the sctx and with the same name
        """

        if not self.jar_path:
            raise FileNotFoundError("KiCo not found\n")

        result = subprocess.run(
            [
                "java",
                "-jar",
                self.jar_path,
                "-s",
                "de.cau.cs.kieler.sccharts.simulation.netlist.c",
                "-o",
                str(sctx_path.with_suffix(".exe"))
                if output_path is None
                else output_path,
                str(sctx_path),
            ],
            check=False,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            raise RuntimeError(
                f"Failed to compile {sctx_path} using JAR at {self.jar_path}:\n{result.stderr}"
            )

    def langium_compile_sctx_to_json(
        self, sctx_path: Path, output_path: Path | None = None
    ):
        """
        If the output path is not set, it defaults to save the json file
        in the same place as the sctx and with the same name
        with the prefix 'langium_'
        """

        if output_path is None:
            name = "langium_" + sctx_path.with_suffix(".json").name
            output_path = sctx_path.parent / name

        result = subprocess.run(
            [
                "npm",
                "run",
                "convert-sctx",
                str(sctx_path),
                output_path,
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"Failed to compile {sctx_path} using langium converter:\n{result.stderr}"
            )

    def _run_json(self, inputs: list[dict[str, Any]]):
        path = self.model_path
        if _cache_langium_mode():
            name = "langium_" + self.model_path.name
            path = self.model_path.parent / name

        if _reset_json_mode() or not os.path.exists(path):
            if _langium_mode():
                self.langium_compile_sctx_to_json(self.model_path.with_suffix(".sctx"))
            else:
                self.kico_compile_sctx_to_json(self.model_path.with_suffix(".sctx"))

        result = run_npm(path, inputs, self.wonly)

        if result.returncode != 0:
            raise RuntimeError(f"Failed to run model {path}:\n{result.stderr}")

        return result

    def _run_sctx(self, inputs: list[dict[str, Any]]):
        result = run_npm(self.model_path.with_suffix(".sctx"), inputs, self.wonly)

        if result.returncode != 0:
            raise RuntimeError(
                f"Failed to run model {self.model_path}:\n{result.stderr}"
            )

        return result

    def parse_interpreter_output(self, stdout: str) -> list[dict[str, Any]]:
        output_start = stdout.index("{")

        if "Model terminated - Final Variables:" in stdout:
            stdout = stdout[: stdout.index("Model terminated - Final Variables:")]
        if "[WARNING]" in stdout:
            # Remove lines starting with [WARNING]
            stdout = "\n".join(
                [
                    line
                    for line in stdout.splitlines()
                    if not line.startswith("[WARNING]")
                ]
            )

        stdout = stdout[output_start:].replace("}\n{", "},{")

        outputs: list[dict[str, Any]] = json.loads(f"[{stdout}]")[1:]

        return outputs

    def run(self, inputs: list[dict[str, Any]]):
        result: subprocess.CompletedProcess[str]
        try:
            if (not _langium_mode()) or _cache_langium_mode():
                result = self._run_json(inputs)
            else:
                result = self._run_sctx(inputs)

        except Exception as e:
            return [{"status": "error", "error": str(e)}]

        return self.parse_interpreter_output(result.stdout)

    def generate_expected(
        self,
        inputs: list[dict[str, Any]],
        variables: list[str],
    ) -> list[dict[str, Any]]:
        """Run kico.jar compiled model tick-by-tick and return filtered outputs.

        Compiles the .sctx file to an ELF executable,
        feeds each input via stdin and parses JSON output from stdout

        Usage in tests:
            # Generate expected output without saving to file
            expected = generate_expected("ABO", inputs, ["A", "B", "O1", "O2"])
            assert runner.run(inputs) == expected
        """

        exe_path: Path = self.model_path.with_suffix(".exe")

        if not exe_path.exists() or _reset_exe_mode():
            self.kico_compile_sctx_to_exe(exe_path.with_suffix(".sctx"))

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
                _ = proc.stdin.write(json.dumps(inp) + "\r\n")
                proc.stdin.flush()
                line = proc.stdout.readline()

                if not line:
                    break

                result = json.loads(line)

            except (json.JSONDecodeError, BrokenPipeError) as e:
                raise RuntimeError(
                    f"Failed to process tick {i} for '{exe_path}': {e}"
                ) from e

            terminated: bool = result.get("_TERM", result.get("terminated", False))
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
            case "string":
                if number_range is None:
                    raise ValueError("number_range must be specified for int type")
                return [
                    {
                        name: generate_random_string(
                            self.random.randint(
                                int(number_range[0]), int(number_range[1])
                            ),
                            self.random,
                        )
                    }
                    for _ in range(n)
                ]
            case _:
                return []
