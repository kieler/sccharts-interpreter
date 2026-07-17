from base import TestRunner, assert_subset, generate_expected


def test_abort_and_regions():
    """Test Abort and Basics model"""
    runner = TestRunner("AbortAndRegions")
    inputs = [1, 2, 3, 4, 5, 6]

    for i in inputs:
        runner.setup()
        run_inputs = [{"I": i} for _ in range(10)]

        runner.add_random_inputs(run_inputs, "int", "I", 10, (0, 6))
        expected = generate_expected("AbortAndRegions", run_inputs, ["I", "O"])

        assert_subset(runner.run(run_inputs), expected)
