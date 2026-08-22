from tests.base import TestRunner, assert_subset, generate_expected


def test_arithmetic():
    """Test Arithmetics of Actions"""
    runner = TestRunner("Arithmetics")
    runner.setup()

    inputs = [{}, {}, {}, {}, {}]

    expected = generate_expected("Arithmetics", inputs, ["A", "B", "C"])

    assert_subset(runner.run(inputs), expected)
