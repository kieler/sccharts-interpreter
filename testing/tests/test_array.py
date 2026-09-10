from tests.base import TestRunner
from tests.utils import assert_subset


def test_array_simple():
    """Test simple Arrays"""
    runner = TestRunner("./models/SimpleArray")

    inputs = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]

    expected = runner.generate_expected(inputs, [])

    assert_subset(runner.run(inputs), expected)


def test_multi_dim_array():
    """Test multi-dimensional Arrays"""
    runner = TestRunner("./models/MultiDimArray")

    inputs = [{}, {}, {}, {}, {}, {}, {}, {}, {}]

    expected = runner.generate_expected(inputs, [])

    assert_subset(runner.run(inputs), expected)
