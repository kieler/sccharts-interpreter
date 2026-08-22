from tests.base import TestRunner, assert_subset, generate_expected


def test_history():
    """Testing if history transitions work properly"""
    runner = TestRunner("HistoryTransition")
    runner.setup()

    inputs = [
        {"A": False, "R1": False, "R2": False},
        {"A": True, "R1": False, "R2": False},
        {"A": False, "R1": False, "R2": False},
        {"A": False, "R1": True, "R2": False},
        {"A": False, "R1": False, "R2": True},
        {"A": False, "R1": False, "R2": False},
        {"A": False, "R1": False, "R2": False},
        {"A": False, "R1": False, "R2": False},
    ]

    expected = generate_expected("HistoryTransition", inputs, ["A", "R1", "R2", "O"])

    assert_subset(runner.run(inputs), expected)
