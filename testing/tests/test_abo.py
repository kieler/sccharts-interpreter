from tests.new_base import TestRunner, assert_subset


def test_abo_Afirst():
    """Test ABO model"""
    runner = TestRunner("./sctx/ABO")

    inputs = [
        {"A": False, "B": False},
        {"A": True, "B": False},
        {"A": False, "B": True},
        {"A": False, "B": False},
        {"A": False, "B": False},
    ]

    expected = runner.generate_expected(inputs, ["A", "B", "O1", "O2"])

    assert_subset(runner.run(inputs), expected)


def test_abo_Bfirst():
    """Test ABO model"""
    runner = TestRunner("./sctx/ABO")

    inputs = [
        {"A": False, "B": False},
        {"A": False, "B": True},
        {"A": False, "B": False},
        {"A": True, "B": False},
        {"A": False, "B": False},
    ]

    expected = runner.generate_expected(inputs, ["A", "B", "O1", "O2"])

    assert_subset(runner.run(inputs), expected)
