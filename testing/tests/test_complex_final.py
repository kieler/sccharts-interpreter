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


def test_complex_final_2():
    """Testing the ComplexFinalState2 Model"""
    runner = TestRunner("ComplexFinalState2")

    for seed in [100, 1212, 7329847, 2, 42, 13]:
        runner.setup(seed=seed)
        inputs = []
        runner.add_random_inputs(inputs, "bool", "T1", 10)
        runner.add_random_inputs(inputs, "bool", "T2", 10)
        runner.add_random_inputs(inputs, "bool", "T3", 10)

        expected = generate_expected(
            "ComplexFinalState2", inputs, ["T1", "T2", "T3", "A1", "R1S", "R2S"]
        )

        assert_subset(runner.run(inputs), expected)
