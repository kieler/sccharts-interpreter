from tests.base import TestRunner
from tests.utils import assert_subset


def test_local_var():
    """Test if local variables work"""
    runner = TestRunner("./models/LocalVar")

    expected = [
        {"variables": {"Var1": 0, "Done": False}},
        {"variables": {"Var1": 0, "Done": False}},
        {"variables": {"Var1": 0, "Done": False}},
        {"variables": {"Var1": 0, "Done": False}},
        {"variables": {"Var1": 0, "Done": False}},
        {"variables": {"Var1": 5, "Done": False}},
        {"variables": {"Var1": 5, "Done": False}},
        {"variables": {"Var1": 5, "Done": False}},
        {"variables": {"Var1": 5, "Done": True}},
        {"variables": {"Var1": 5, "Done": True}},
    ]

    inputs = [{} for _ in range(len(expected))]

    assert_subset(runner.run(inputs), expected)


def test_local_var_set():
    """Test if initial assignments of variables work correctly"""
    runner = TestRunner("./models/LocalVarSet")

    expected = [
        {"variables": {"A": 100, "C": 0}},
        {"variables": {"A": 100, "C": 100}},
    ]

    inputs = [{} for _ in range(len(expected))]

    assert_subset(runner.run(inputs), expected)
