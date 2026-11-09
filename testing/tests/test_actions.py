from tests.base import TestRunner
from tests.utils import assert_subset


def test_actions():
    """Test State Actions"""
    runner = TestRunner("./models/Actions")

    inputs = [
        {"A": False, "B": False},
        {"A": True, "B": False},
        {"A": False, "B": False},
        {"A": False, "B": True},
        {"A": False, "B": False},
    ]

    expected = runner.generate_expected(
        inputs, ["A", "B", "O1", "O2", "O3", "O4", "O5"]
    )

    assert_subset(runner.run(inputs), expected)
