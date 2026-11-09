from tests.base import TestRunner
from tests.utils import assert_subset


def test_ref():
    """Test Reference Charts and loading of them"""
    runner = TestRunner("./models/Ref")

    inputs = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]

    expected = runner.generate_expected(inputs, ["A", "B", "C"])

    assert_subset(runner.run(inputs), expected)


def test_bind_array():
    """Tests if Binding an array index works properly"""
    runner = TestRunner("./models/RefBindArray")

    inputs = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]

    expected = runner.generate_expected(inputs, ["Array"])

    assert_subset(runner.run(inputs), expected)


def test_bind_implicit():
    """
    When the reference chart is stated as
    state A is A
    then all variables get mapped implicitly based on those
    with the same name getting assigned to each other.
    """
    runner = TestRunner("./models/RefBindImplicit")

    inputs = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]

    expected = runner.generate_expected(inputs, ["A"])

    assert_subset(runner.run(inputs), expected)
