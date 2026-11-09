import json
import os
import re

from tests.base import TestRunner, _langium_mode, _reset_json_mode
from tests.utils import assert_subset


def unrename(data):
    """
    When the test is run with KiCo, it already renames the states properly
    so this un-renames them to test that the interpreter is working correctly.
    When the test is run with our convertion this isn't an issue, but we
    want to be able to test it with KiCo to make sure we can say if a
    problem comes from the converter or interpreter.
    """
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

    if not _langium_mode():
        """
        My langium based converter does not rename states with the same name
        so there is no need to un-rename
        """
        runner = TestRunner("./models/NameDouble")
        path = "./models/NameDouble.json"

        if not os.path.exists(path) or _reset_json_mode():
            runner.kico_compile_sctx_to_json(runner.model_path.with_suffix(".sctx"))

        # Undoing the work KiCo did so this can test the feature
        with open(path, "r") as f:
            file = json.load(f)

        file = unrename(file)

        with open(path, "w") as f:
            json.dump(file, f, indent=2)

    runner = TestRunner("./models/NameDouble")

    inputs = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]

    expected = runner.generate_expected(inputs, ["O", "x", "terminated"])

    assert_subset(runner.run(inputs), expected)
