from tests.base import TestRunner
from tests.utils import assert_subset


def test_abro_basic():
    """Test ABRO model"""
    runner = TestRunner("./models/ABRO")

    inputs = [
        {"A": False, "B": False, "R": False},
        {"A": False, "B": True, "R": False},
        {"A": True, "B": False, "R": False},
        {"A": False, "B": False, "R": False},
        {"A": False, "B": False, "R": False},
        {"A": False, "B": False, "R": True},
        {"A": False, "B": False, "R": False},
    ]

    expected = runner.generate_expected(inputs, ["A", "B", "R", "O"])

    assert_subset(runner.run(inputs), expected)
