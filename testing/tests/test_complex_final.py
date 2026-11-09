from tests.base import TestRunner
from tests.utils import assert_subset


def test_final_complex():
    """Testing if complex final states work properly"""
    runner = TestRunner("./models/ComplexFinal")

    inputs = [
        {"A": False, "B": False},
        {"A": False, "B": True},
        {"A": False, "B": False},
        {"A": False, "B": False},
        {"A": True, "B": False},
    ]

    expected = runner.generate_expected(inputs, ["A", "B", "C"])

    assert_subset(runner.run(inputs), expected)


def test_complex_final_2():
    """Testing the ComplexFinalState2 Model"""

    for seed in [100, 1212, 7329847, 2, 42, 13]:
        runner = TestRunner("./models/ComplexFinalState2", seed=seed)

        inputs = []
        runner.add_random_inputs(inputs, "bool", "T1", 10)
        runner.add_random_inputs(inputs, "bool", "T2", 10)
        runner.add_random_inputs(inputs, "bool", "T3", 10)

        expected = runner.generate_expected(
            inputs, ["T1", "T2", "T3", "A1", "R1S", "R2S"]
        )

        assert_subset(runner.run(inputs), expected)
