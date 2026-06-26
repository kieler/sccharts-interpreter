from base import TestRunner, generate_expected


def test_abro_basic():
    """Test ABRO model"""
    runner = TestRunner("ABRO")
    runner.setup()

    inputs = [
        {"A": False, "B": False, "R": False},
        {"A": False, "B": True, "R": False},
        {"A": True, "B": False, "R": False},
        {"A": False, "B": False, "R": False},
        {"A": False, "B": False, "R": False},
        {"A": False, "B": False, "R": True},
        {"A": False, "B": False, "R": False},
    ]

    expected = generate_expected("ABRO", inputs, ["A", "B", "R", "O"])

    assert runner.run(inputs) == expected
