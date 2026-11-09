"""
These tests are to check if the models from the private-models repo I
adapted to work with the interpreter actually produce the correct results.
They have to be adapted if they use unsupported features.
"""

from tests.base import TestRunner
from tests.utils import assert_subset


def test_trafficlights():
    """Test if the adapted trafficlight model works the same as the original"""
    runnerOriginal = TestRunner(
        "../../models-private/sccharts/established-models/trafficlight"
    )
    runnerAdapted = TestRunner("../../models-private/sccharts/grille/trafficlight")

    inputs = [{"Sec": True}] + [{} for _ in range(50)]

    expected = runnerOriginal.generate_expected(inputs, ["PG", "PR", "CG", "CR", "CY"])

    assert_subset(runnerAdapted.run(inputs), expected)


def test_trafficlights_with_error():
    """Test if the adapted trafficlight model works the same as the original"""
    runnerOriginal = TestRunner(
        "../../models-private/sccharts/established-models/trafficlight"
    )
    runnerAdapted = TestRunner("../../models-private/sccharts/grille/trafficlight")

    inputs = [{"Sec": True}] + [{} for _ in range(50)]
    for i in range(10):
        inputs[20 + i]["Error"] = True

    expected = runnerOriginal.generate_expected(inputs, ["PG", "PR", "CG", "CR", "CY"])

    assert_subset(runnerAdapted.run(inputs), expected)
