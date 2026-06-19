from base import TestRunner


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
        {"terminated": False, "output": {"O": False}},
        {"terminated": False, "output": {"O": False}},
        {"terminated": True, "output": {"O": True}},
    ]

    assert runner.run(inputs) == expected
