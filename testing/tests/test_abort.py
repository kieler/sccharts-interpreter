from tests.base import TestRunner
from tests.utils import assert_subset


def test_join():
    """Test Joins"""
    runner = TestRunner("./models/Abort")

    inputs = [
        {"A": False, "Strong": False, "Weak": False, "Join": False},
        {"A": False, "Strong": False, "Weak": False, "Join": True},
        {"A": True, "Strong": False, "Weak": False, "Join": False},
        {"A": False, "Strong": False, "Weak": False, "Join": True},
        {"A": False, "Strong": False, "Weak": False, "Join": False},
    ]

    expected = runner.generate_expected(
        inputs, ["A", "Join", "Weak", "Strong", "O1", "OJ", "OW", "OS"]
    )

    assert_subset(runner.run(inputs), expected)


def test_strong():
    """Test Strong Aborts"""
    runner = TestRunner("./models/Abort")

    inputs = [
        {"A": False, "Strong": False, "Weak": False, "Join": False},
        {"A": True, "Strong": True, "Weak": False, "Join": False},
        {"A": False, "Strong": False, "Weak": False, "Join": False},
    ]

    expected = runner.generate_expected(
        inputs, ["A", "Join", "Weak", "Strong", "O1", "OJ", "OW", "OS"]
    )

    assert_subset(runner.run(inputs), expected)


def test_weak():
    """Test Weak Aborts"""
    runner = TestRunner("./models/Abort")

    inputs = [
        {"A": False, "Strong": False, "Weak": False, "Join": False},
        {"A": True, "Strong": False, "Weak": True, "Join": False},
        {"A": False, "Strong": False, "Weak": False, "Join": False},
    ]

    expected = runner.generate_expected(
        inputs, ["A", "Join", "Weak", "Strong", "O1", "OJ", "OW", "OS"]
    )

    assert_subset(runner.run(inputs), expected)
