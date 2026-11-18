from tests.base import TestRunner
from tests.utils import assert_subset


def test_abo():
    """Test ABO model"""

    """A first"""
    runner = TestRunner("./models/ABO")

    inputs = [
        {"A": False, "B": False},
        {"A": True, "B": False},
        {"A": False, "B": True},
        {"A": False, "B": False},
        {"A": False, "B": False},
    ]

    expected = runner.generate_expected(inputs, ["A", "B", "O1", "O2"])

    assert_subset(runner.run(inputs), expected)

    """B first"""
    runner = TestRunner("./models/ABO")

    inputs = [
        {"A": False, "B": False},
        {"A": False, "B": True},
        {"A": False, "B": False},
        {"A": True, "B": False},
        {"A": False, "B": False},
    ]

    expected = runner.generate_expected(inputs, ["A", "B", "O1", "O2"])

    assert_subset(runner.run(inputs), expected)


def test_abo_scheduling_must_fail():
    """
    Known to fail
    This is to see if reordering A and B changes the behaviour of the model
    With KiCo scheduling, it shouldn't but the interpreter does
    """

    """A first"""
    runnerBAO = TestRunner("./models/BAO")
    runnerABO = TestRunner("./models/BAO")

    inputs = [
        {"A": False, "B": False},
        {"A": True, "B": False},
        {"A": False, "B": True},
        {"A": False, "B": False},
        {"A": False, "B": False},
    ]

    expectedBAO = runnerBAO.generate_expected(inputs, ["A", "B", "O1", "O2"])
    expectedABO = runnerABO.generate_expected(inputs, ["A", "B", "O1", "O2"])

    assert_subset(expectedABO, expectedBAO)

    assert_subset(runnerBAO.run(inputs), expectedBAO)
