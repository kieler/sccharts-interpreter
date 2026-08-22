from tests.base import TestRunner, assert_subset


def test_ao():
    """Test AO model"""
    runner = TestRunner("AO")
    runner.setup()

    inputs = [
        {"A": False},
        {"A": False},
        {"A": True},
        {"A": False},
        {"A": False},
    ]

    expected = [
        {"terminated": False, "variables": {"A": False, "O": False}},
        {"terminated": False, "variables": {"A": False, "O": False}},
        {"terminated": True, "variables": {"A": True, "O": True}},
    ]

    assert_subset(runner.run(inputs), expected)
