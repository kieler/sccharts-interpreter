from base import TestRunner, generate_expected


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

    expected = generate_expected("ABO", inputs, ["A", "B", "O1", "O2"])

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

    expected = generate_expected("ABO", inputs, ["A", "B", "O1", "O2"])

    assert runner.run(inputs) == expected
