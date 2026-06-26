from base import TestRunner, generate_expected


def test_actions():
    """Test State Actions"""
    runner = TestRunner("Actions")
    runner.setup()

    inputs = [
        {"A": False, "B": False},
        {"A": True, "B": False},
        {"A": False, "B": False},
        {"A": False, "B": True},
        {"A": False, "B": False},
    ]

    expected = generate_expected(
        "Actions", inputs, ["A", "B", "O1", "O2", "O3", "O4", "O5"]
    )

    assert runner.run(inputs) == expected
