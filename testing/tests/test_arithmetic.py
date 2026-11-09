from tests.base import TestRunner
from tests.utils import assert_subset


def test_arithmetic():
    """Test Arithmetics of Actions"""
    runner = TestRunner("./models/Arithmetics")

    inputs = [{}, {}, {}, {}, {}]

    expected = runner.generate_expected(inputs, ["A", "B", "C"])

    assert_subset(runner.run(inputs), expected)
