from base import TestRunner


def test_immediate():
    """Test IM (immediate) model"""
    runner = TestRunner("IM")
    runner.setup()

    inputs = [
        {"A": False},
        {"A": False},
        {"A": True},
        {"A": False},
        {"A": False},
    ]

    expected = [
        {"terminated": False, "output": {"O1": False, "O2": False, "O3": False}},
        {"terminated": False, "output": {"O1": False, "O2": False, "O3": False}},
        {"terminated": True, "output": {"O1": True, "O2": True, "O3": True}},
    ]

    assert runner.run(inputs) == expected
