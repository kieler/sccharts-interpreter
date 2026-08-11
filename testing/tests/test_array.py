from base import TestRunner, assert_subset, generate_expected


def test_array_simple():
    """Test simple Arrays"""
    runner = TestRunner("SimpleArray")
    runner.setup()

    inputs = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]

    expected = generate_expected("SimpleArray", inputs, [])

    assert_subset(runner.run(inputs), expected)


def test_multi_dim_array():
    """Test multi-dimensional Arrays"""
    runner = TestRunner("MultiDimArray")
    runner.setup()

    inputs = [{}, {}, {}, {}, {}, {}, {}, {}, {}]

    expected = generate_expected("MultiDimArray", inputs, [])

    assert_subset(runner.run(inputs), expected)
