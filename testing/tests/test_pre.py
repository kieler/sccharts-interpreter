from tests.base import TestRunner
from tests.utils import assert_subset


def test_pre():
    """Test that pre() is working"""
    runner = TestRunner("./models/Pre")

    inputs = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]

    expected = runner.generate_expected(inputs, ["A", "B"])

    assert_subset(runner.run(inputs), expected)
