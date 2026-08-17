import ast
import sys


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

    return value_str  # str as fallback


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
