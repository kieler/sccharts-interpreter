from tests.base import TestRunner
from tests.utils import assert_subset


def test_history():
    """Testing if history transitions work properly"""
    runner = TestRunner("./models/HistoryTransition")

    inputs = [
        {"A": False, "R1": False, "R2": False},
        {"A": True, "R1": False, "R2": False},
        {"A": False, "R1": False, "R2": False},
        {"A": False, "R1": True, "R2": False},
        {"A": False, "R1": False, "R2": True},
        {"A": False, "R1": False, "R2": False},
        {"A": False, "R1": False, "R2": False},
        {"A": False, "R1": False, "R2": False},
    ]

    expected = runner.generate_expected(inputs, ["A", "R1", "R2", "O"])

    assert_subset(runner.run(inputs), expected)
