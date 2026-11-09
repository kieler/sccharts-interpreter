"""
This uses the 2017 version of the Railway Project Controller as
a benchmark test. In the model repository exists a ..._Test.sctx
which sets some variables. That is the one used here.
Specifically a version of it, which expands away a handful of signals.
Otherwise it is the same model.
"""

from tests.base import TestRunner
from tests.utils import create_custom_log


def test_railway_controller():
    assert True
    runner = TestRunner(
        "../../models-private/sccharts/grille/RailwayProject_17ss/Controller/src/Controller_Testing"
    )

    inputs = [{} for _ in range(250)]

    result = runner.run(inputs)
    create_custom_log(result, "railway_controller")
