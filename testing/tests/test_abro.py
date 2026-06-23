from base import TestRunner


def test_abro_basic():
    """Test ABRO model"""
    runner = TestRunner("ABRO")
    runner.setup()

    inputs = [
        {"A": False, "B": False, "R": False},
        {"A": False, "B": True, "R": False},
        {"A": True, "B": False, "R": False},
        {"A": False, "B": False, "R": False},
        {"A": False, "B": False, "R": False},
        {"A": False, "B": False, "R": True},
        {"A": False, "B": False, "R": False},
    ]

    expected = [
        {
            "terminated": False,
            "variables": {"A": False, "B": False, "R": False, "O": False},
        },
        {
            "terminated": False,
            "variables": {"A": False, "B": True, "R": False, "O": False},
        },
        {
            "terminated": False,
            "variables": {"A": True, "B": False, "R": False, "O": True},
        },
        {
            "terminated": False,
            "variables": {"A": False, "B": False, "R": False, "O": True},
        },
        {
            "terminated": False,
            "variables": {"A": False, "B": False, "R": False, "O": True},
        },
        {
            "terminated": False,
            "variables": {"A": False, "B": False, "R": True, "O": False},
        },
        {
            "terminated": False,
            "variables": {"A": False, "B": False, "R": False, "O": False},
        },
    ]

    assert runner.run(inputs) == expected
