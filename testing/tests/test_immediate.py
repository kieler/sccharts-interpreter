from tests.base import TestRunner
from tests.utils import assert_subset


def test_immediate():
    """Tests immediate transitions"""
    runner = TestRunner("./models/Immediate")

    inputs = [
        {"A": False},
        {"A": False},
        {"A": True},
        {"A": False},
        {"A": False},
    ]

    expected = runner.generate_expected(inputs, ["A", "O1", "O2", "O3"])

    assert_subset(runner.run(inputs), expected)
