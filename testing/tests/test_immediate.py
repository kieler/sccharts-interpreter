from base import TestRunner, generate_expected


def test_immediate():
    """Tests immediate transitions"""
    runner = TestRunner("Immediate")
    runner.setup()

    inputs = [
        {"A": False},
        {"A": False},
        {"A": True},
        {"A": False},
        {"A": False},
    ]

    expected = generate_expected("Immediate", inputs, ["A", "O1", "O2", "O3"])

    assert runner.run(inputs) == expected
