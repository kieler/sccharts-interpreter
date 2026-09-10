import ast
import random
import re
import string
import sys

from typing_extensions import Any


def parse_ktrace(ktrace: str):
    ticks = ktrace.strip().split(";")
    trace = {"inputs": [], "outputs": []}

    for tick in ticks:
        tick = tick.replace("{", "[").replace("}", "]")

        if tick.strip() == "reset":
            trace["inputs"].append({"reset": True})
            trace["outputs"].append({})
            continue

        if "=>" in tick:
            input_part, output_part = tick.split("=>", 1)
        else:
            input_part = tick
            output_part = ""

        inp = parse_side(input_part) if input_part.strip() else {}
        out = parse_side(output_part) if output_part.strip() else {}

        trace["inputs"].append(inp)
        trace["outputs"].append(out)

    return trace


def parse_var_type(value_str: str | None):
    if value_str is None:
        return None

    lowered = value_str.lower()

    if lowered == "true":
        return True
    if lowered == "false":
        return False

    if lowered == "null":
        return None

    if lowered.startswith("[") and lowered.endswith("]"):
        return ast.literal_eval(value_str)

    try:
        return int(lowered)
    except ValueError:
        pass

    try:
        return float(lowered)
    except ValueError:
        pass

    # str as fallback, but remove quotaion marks
    # otherwise we compare '"Hellow World!"' with "Hello World!", which fails
    return value_str.replace('"', "")


def parse_side(side: str) -> dict:
    result = {}

    side = side.replace(" = ", "=").strip()

    # Go through all ' ' and split at the one before a '='
    # as each vaiable should have 1 '='
    separatorIndices = [i for i, c in enumerate(side) if c == " "]
    separatorIndices = [0] + separatorIndices + [len(side)]
    equalIndices = [i for i, c in enumerate(side) if c == "="]

    splitIndices: list[int] = [0]
    for index in equalIndices[1:]:
        i = 0
        while separatorIndices[i] < index:
            i += 1
        splitIndices.append(separatorIndices[i - 1])
    splitIndices.append(len(side) - 1)

    for i in range(len(splitIndices) - 1):
        assignment = side[splitIndices[i] : splitIndices[i + 1] + 1]
        var, value = assignment.split("=")
        result[var.strip()] = parse_var_type(value.strip())

    return result


if __name__ == "__main__":
    path = sys.argv[1]
    with open(path, "r") as f:
        ktrace = f.read()

    trace = parse_ktrace(ktrace)
    print(trace)


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

        match = re.match(r"^(.+?)(\[.*\])+$", k)

        if match:
            var_name = match.group(1)
            indices_str = match.group(2)
            assert var_name in actual, f"{full_key}: key missing"

            source = actual[var_name]

            indices = re.findall(r"\[(\d+)\]", indices_str)
            for idx_str in indices:
                idx = int(idx_str)
                assert isinstance(source, list), f"{full_key}: expected a list"
                assert idx < len(source), (
                    f"{full_key}: index {idx} out of range (length {len(source)})"
                )
                source = source[idx]

            assert source == v, f"{full_key}: expected {v}, got {source}"
        elif isinstance(v, dict):
            assert k in actual, f"{full_key}: key missing"
            assert isinstance(actual[k], dict), f"{full_key} is not a dict"
            _assert_subset_dict(actual[k], v, full_key)
        else:
            assert k in actual, f"{full_key}: key missing"
            assert actual[k] == v, f"{full_key}: expected {v}, got {actual[k]}"


def generate_random_string(n: int, random: random.Random) -> str:
    return "".join(random.choices(string.ascii_letters, k=n))
