from tests.base import TestRunner, assert_subset


def test_local_var():
    """Test if local variables work"""
    runner = TestRunner("LocalVar")
    runner.setup()

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
