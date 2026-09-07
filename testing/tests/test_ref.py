from tests.new_base import TestRunner, assert_subset


def test_ref():
    """Test Reference Charts and loading of them"""
    runner = TestRunner("./sctx/Ref")

    inputs = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]

    expected = runner.generate_expected(inputs, ["A", "B", "C"])

    assert_subset(runner.run(inputs), expected)
