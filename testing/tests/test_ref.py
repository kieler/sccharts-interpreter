from tests.base import TestRunner, assert_subset, generate_expected


def test_ref():
    """Test Reference Charts and loading of them"""
    runner = TestRunner("Ref")
    runner.setup()

    inputs = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]

    expected = generate_expected("Ref", inputs, ["A", "B", "C"])

    assert_subset(runner.run(inputs), expected)
