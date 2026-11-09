import ast
import json
import os
import random
import re
import string
from pathlib import Path

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
            if k == "telemetry":
                continue

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


def create_custom_log(
    data: dict | list,
    name: str,
    dir: str = "custom",
    model_info: dict | None = None,
):
    if not os.path.exists(f"logs/{dir}"):
        os.makedirs(f"logs/{dir}", exist_ok=True)

    path = f"logs/{dir}/" + name + ".json"
    entry = {"outputs": data}
    if model_info is not None:
        entry["model_info"] = model_info
    with open(path, "w") as f:
        json.dump(entry, f, indent=2)


def _count_states_and_transitions(obj) -> tuple[int, int]:
    """Recursively count states and transitions in a chart tree.

    Handles both region dicts (which have 'states' arrays) and state dicts
    (which have isInitial/isFinal/isConnector booleans). Returns
    (state_count, transition_count).
    """
    total_states = 0
    total_transitions = 0

    if not isinstance(obj, dict):
        return 0, 0

    # A node is a state if it has any of the three boolean markers that only states have.
    is_state = any(
        isinstance(obj.get(key), bool)
        for key in ("isInitial", "isFinal", "isConnector")
    )

    if is_state:
        total_states += 1
        trans = obj.get("transitions", [])
        total_transitions += len(trans)
        # States can contain nested regions
        for r in obj.get("regions", []):
            s, t = _count_states_and_transitions(r)
            total_states += s
            total_transitions += t

    elif "states" in obj:
        # This is a region; process each contained state
        for state in obj["states"]:
            s, t = _count_states_and_transitions(state)
            total_states += s
            total_transitions += t
        # Regions can also have nested regions
        for r in obj.get("regions", []):
            s, t = _count_states_and_transitions(r)
            total_states += s
            total_transitions += t

    return total_states, total_transitions


def get_model_info(model_path: Path) -> dict | None:
    """Extract model metadata from the compiled JSON representation.

    Returns a dict of metadata, or None if the JSON file doesn't exist.
    """
    json_path = model_path.with_suffix(".json")
    if not json_path.exists():
        return None

    try:
        with open(json_path) as f:
            charts = json.load(f)
    except (json.JSONDecodeError, ValueError):
        return None

    if not isinstance(charts, list) or len(charts) == 0:
        return None

    # Model name from the primary chart's id or filename
    model_name = charts[0].get("id", Path(model_path).stem)

    # Collect all stats across every chart in the array (including referenced ones)
    total_states = 0
    total_transitions = 0
    total_regions = 0
    input_vars = 0
    output_vars = 0

    for chart in charts:
        regions = chart.get("regions", [])

        # Count top-level regions (states are inside them)
        total_regions += len(regions)

        # Sum up states & transitions from each region
        for r in regions:
            s, t = _count_states_and_transitions(r)
            total_states += s
            total_transitions += t

        # Count variables
        chart_vars = chart.get("variables", [])
        input_vars += sum(1 for v in chart_vars if v.get("isInput"))
        output_vars += sum(1 for v in chart_vars if v.get("isOutput"))

    # Track unique referenced subchart files (from "reference" keys on states)
    def _find_references(obj):
        """Recursively find all state/reference dicts in the tree."""
        refs = []
        if isinstance(obj, dict):
            if "reference" in obj:
                ref_obj = obj["reference"]
                if isinstance(ref_obj, dict):
                    if "targetFile" in ref_obj:
                        refs.append(ref_obj["targetFile"])
            for v in obj.values():
                refs.extend(_find_references(v))
        elif isinstance(obj, list):
            for item in obj:
                refs.extend(_find_references(item))
        return refs

    all_refs = []
    for chart in charts:
        all_refs.extend(_find_references(chart))
    unique_ref_files = set(all_refs)

    # Reference charts may appear either as multiple top-level chart objects
    # (inlined subcharts) or as states with "reference" keys that point elsewhere
    # but have no targetFile in the current JSON.  We need to detect both cases.
    has_embedded_refs = len(charts) > 1

    def _has_any_reference(obj):
        """Return True if any dict node has a non-empty 'reference' key."""
        if isinstance(obj, dict):
            ref = obj.get("reference")
            if ref and isinstance(ref, dict):
                return True
            for v in obj.values():
                if _has_any_reference(v):
                    return True
        elif isinstance(obj, list):
            for item in obj:
                if _has_any_reference(item):
                    return True
        return False

    has_link_refs = any(_has_any_reference(chart) for chart in charts)
    uses_reference_charts = has_embedded_refs or has_link_refs

    # Count total referenced states (from subchart files)
    ref_state_count = 0
    if uses_reference_charts:
        for ref_file in unique_ref_files:
            try:
                # The reference file is a path; load its compiled json to count states
                ref_json_path = Path(ref_file.replace("file:", ""))
                if ref_json_path.exists():
                    with open(ref_json_path) as rf:
                        ref_charts = json.load(rf)
                    for rc in ref_charts:
                        rs, rt = 0, 0
                        for r in rc.get("regions", []):
                            s2, t2 = _count_states_and_transitions(r)
                            rs += s2
                            rt += t2
                        ref_state_count += rs
            except (FileNotFoundError, json.JSONDecodeError, ValueError):
                pass

    return {
        "model_name": model_name,
        "states": total_states,
        "transitions": total_transitions,
        "regions": total_regions,
        "variables": input_vars + output_vars,
        "input_variables": input_vars,
        "output_variables": output_vars,
        "uses_reference_charts": uses_reference_charts,
        "referenced_chart_files": sorted(unique_ref_files),
        "referenced_states": ref_state_count,
    }
