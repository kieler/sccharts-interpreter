from tests.base import TestRunner
from tests.utils import assert_subset


def test_abort_and_regions():
    """Test Abort and Basics model"""
    runner = TestRunner("./models/AbortAndRegions")
    inputs = [1, 2, 3, 4, 5, 6]

    for i in inputs:
        run_inputs = [{"I": i} for _ in range(10)]

        run_inputs = runner.add_random_inputs(run_inputs, "int", "I", 10, (0, 6))
        expected = runner.generate_expected(run_inputs, ["I", "O"])

        assert_subset(runner.run(run_inputs), expected)
