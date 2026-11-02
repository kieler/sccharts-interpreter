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


def test_const_array():
    """
    Test if setting the array size with a constant works. Like:
    const int A = 3
    int Array[A] = {...}
    """

    runner = TestRunner("./models/ConstArray")

    inputs = [{}, {"I": 0}, {"I": 1}, {"I": 0}, {"I": 2}]

    expected = runner.generate_expected(inputs, ["I", "O"])

    assert_subset(runner.run(inputs), expected)
