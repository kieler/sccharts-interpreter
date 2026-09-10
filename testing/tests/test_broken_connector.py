from tests.base import TestRunner
from tests.utils import assert_subset


def test_broken_connector_bad_input():
    """Test if ending a tick in a connector correctly raises an error."""
    runner = TestRunner("./models/BrokenConnector")

    inputs = [
        {"A": False},
        {"A": False},
        {"A": False},
    ]

    expected = [
        {"status": "error"},
    ]

    assert_subset(runner.run(inputs), expected)


def test_broken_connector_good_input():
    """Test if ending a tick in a connector correctly raises an error."""
    runner = TestRunner("./models/BrokenConnector")

    inputs = [
        {"A": False},
        {"A": True},
        {"A": False},
    ]

    expected = [
        {"terminated": False, "variables": {"A": False}},
        {"terminated": True, "variables": {"A": True}},
    ]

    assert_subset(runner.run(inputs), expected)


def test_broken_connector_Wonly():
    """
    Test if ending a tick in a connector correctly raises a warning in Wonly mode.
    In regular operation, this should raise an error
    (see test_broken_connector_bad_input()), but with Wonly mode this is fine.
    """

    runner = TestRunner("./models/BrokenConnector", wonly=True)

    inputs = [
        {"A": False},
        {"A": False},
        {"A": False},
        {"A": True},
    ]

    expected = [
        {"terminated": False, "variables": {"A": False}},
        {"terminated": False, "variables": {"A": False}},
        {"terminated": False, "variables": {"A": False}},
        {"terminated": True, "variables": {"A": True}},
    ]

    assert_subset(runner.run(inputs), expected)
