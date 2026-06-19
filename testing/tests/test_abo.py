from base import TestRunner


def test_abo_Afirst():
    """Test ABO model"""
    runner = TestRunner("ABO")
    runner.setup()

    inputs = [
        {"A": False, "B": False},
        {"A": True, "B": False},
        {"A": False, "B": True},
        {"A": False, "B": False},
        {"A": False, "B": False},
    ]

    expected = [
        {"terminated": False, "output": {"O1": False, "O2": False}},
        {"terminated": True, "output": {"O1": False, "O2": True}},
    ]

    assert runner.run(inputs) == expected


def test_abo_Bfirst():
    """Test ABO model"""
    runner = TestRunner("ABO")
    runner.setup()

    inputs = [
        {"A": False, "B": False},
        {"A": False, "B": True},
        {"A": False, "B": False},
        {"A": True, "B": False},
        {"A": False, "B": False},
    ]

    expected = [
        {"terminated": False, "output": {"O1": False, "O2": False}},
        {"terminated": False, "output": {"O1": True, "O2": False}},
        {"terminated": False, "output": {"O1": True, "O2": False}},
        {"terminated": True, "output": {"O1": False, "O2": True}},
    ]

    assert runner.run(inputs) == expected
