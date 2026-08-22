from tests.base import TestRunner, assert_subset


def test_broken_connector_bad_input():
    """Test if ending a tick in a connector correctly raises an error."""
    runner = TestRunner("BrokenConnector")
    runner.setup()

    inputs = [
        {"A": False},
        {"A": False},
        {"A": False},
    ]

    expected = [
        {"terminated": False, "variables": {"A": False}, "status": "fine"},
        {"status": "error"},
    ]

    assert_subset(runner.run(inputs), expected)


def test_broken_connector_good_input():
    """Test if ending a tick in a connector correctly raises an error."""
    runner = TestRunner("BrokenConnector")
    runner.setup()

    inputs = [
        {"A": False},
        {"A": True},
        {"A": False},
    ]

    expected = [
        {"terminated": False, "variables": {"A": False}, "status": "fine"},
        {"terminated": True, "variables": {"A": True}, "status": "fine"},
    ]

    assert_subset(runner.run(inputs), expected)


def test_broken_connector_Wonly():
    """
    Test if ending a tick in a connector correctly raises a warning in Wonly mode.
    In regular operation, this should raise an error
    (see test_broken_connector_bad_input()), but with Wonly mode this is fine.
    """

    runner = TestRunner("BrokenConnector")
    runner.setup(wonly=True)

    inputs = [
        {"A": False},
        {"A": False},
        {"A": False},
        {"A": True},
    ]

    expected = [
        {"terminated": False, "variables": {"A": False}, "status": "fine"},
        {"terminated": False, "variables": {"A": False}, "status": "fine"},
        {"terminated": False, "variables": {"A": False}, "status": "fine"},
        {"terminated": True, "variables": {"A": True}, "status": "fine"},
    ]

    assert_subset(runner.run(inputs), expected)
