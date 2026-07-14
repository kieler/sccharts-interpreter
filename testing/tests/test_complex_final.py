from base import TestRunner, assert_subset, generate_expected


def test_final_complex():
    """Testing if complex final states work properly"""
    runner = TestRunner("ComplexFinal")
    runner.setup()

    inputs = [
        {"A": False, "B": False},
        {"A": False, "B": True},
        {"A": False, "B": False},
        {"A": False, "B": False},
        {"A": True, "B": False},
    ]

    expected = generate_expected("ComplexFinal", inputs, ["A", "B", "C"])

    assert_subset(runner.run(inputs), expected)
