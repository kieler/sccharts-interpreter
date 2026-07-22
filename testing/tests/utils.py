import re


def fill_missing_vars(input_vars, input):
    # This whole input var thing is because the kico cli doesnt auto reset input vars like the intrprter cli
    # This way it keeps the old value
    # TODO: should the cli maybe also not reset?
    for var_name, value in input.items():
        input_vars[var_name] = value

    for var_name, value in input_vars.items():
        if var_name not in input:
            input[var_name] = value

    return input_vars, input


def parse_ktrace(ktrace: str):
    ticks = ktrace.strip().split(";")
    trace = {"inputs": [], "outputs": []}

    input_vars = {}

    for tick in ticks:
        if tick.strip() == "reset":
            trace["inputs"].append({"reset": True})
            trace["outputs"].append({})
            continue

        if not tick.strip():
            input_vars, imp = fill_missing_vars(input_vars, {})
            trace["inputs"].append(imp)
            trace["outputs"].append({})
            continue

        if "=>" in tick:
            input_part, output_part = tick.split("=>", 1)
        else:
            input_part = tick
            output_part = ""

        inp = parse_side(input_part) if input_part.strip() else {}
        out = parse_side(output_part) if output_part.strip() else {}

        input_vars, inp = fill_missing_vars(input_vars, inp)

        trace["inputs"].append(inp)
        trace["outputs"].append(out)

    return trace


def parse_var_type(value_str: str):
    lowered = value_str.lower()

    if lowered == "true":
        return True
    if lowered == "false":
        return False

    try:
        return int(lowered)
    except ValueError:
        pass

    try:
        return float(lowered)
    except ValueError:
        pass

    return lowered  # str as fallback


def parse_side(side: str) -> dict:
    result = {}
    # Matches VAR=VALUE or VAR = VALUE or VAR  =  VALUE etc.
    for var_name, value_str in re.findall(r"(\S+)\s*=\s*(\S+)", side):
        result[var_name] = parse_var_type(value_str)
        if result[var_name] == "null":
            result[var_name] = None
    return result
