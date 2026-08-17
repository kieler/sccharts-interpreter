import json
import re

from base import TestRunner, assert_subset, generate_expected


def unrename(data):
    pattern = re.compile(r"^([A-Za-z]+?)\d+$")

    if isinstance(data, dict):
        cleaned_dict = {}
        for key, value in data.items():
            if key.lower() in ("id", "label", "targetid"):
                match = pattern.match(str(value))
                cleaned_dict[key] = match.group(1) if match else value
            else:
                cleaned_dict[key] = unrename(value)
        return cleaned_dict
    elif isinstance(data, list):
        return [unrename(item) for item in data]
    else:
        return data


def test_name_double():
    """
    Testing that renaming of duplicate state names works.
    The sctx2json converter doesn't rename them like KiCO so this is to test it
    """

    runner = TestRunner("NameDouble")
    path = "./json/NameDouble.json"

    # Undoing the work KiCo did so this can test the feature
    with open(path, "r") as f:
        file = json.load(f)

    file = unrename(file)

    with open(path, "w") as f:
        json.dump(file, f, indent=2)

    runner = TestRunner("NameDouble", no_reset=True)
    runner.setup()

    inputs = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]

    expected = generate_expected("NameDouble", inputs, ["O"])

    assert_subset(runner.run(inputs), expected)
