from tests.base import TestRunner
from tests.utils import assert_subset


def test_ref():
    """Test Reference Charts and loading of them"""
    runner = TestRunner("./models/Ref")

    inputs = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]

    expected = runner.generate_expected(inputs, ["A", "B", "C"])

    assert_subset(runner.run(inputs), expected)
