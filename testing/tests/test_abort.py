from base import TestRunner, assert_subset, generate_expected


def test_join():
    """Test Joins"""
    runner = TestRunner("Abort")
    runner.setup()

    inputs = [
        {"A": False, "Strong": False, "Weak": False, "Join": False},
        {"A": False, "Strong": False, "Weak": False, "Join": True},
        {"A": True, "Strong": False, "Weak": False, "Join": False},
        {"A": False, "Strong": False, "Weak": False, "Join": True},
        {"A": False, "Strong": False, "Weak": False, "Join": False},
    ]

    expected = generate_expected(
        "Abort", inputs, ["A", "Join", "Weak", "Strong", "O1", "OJ", "OW", "OS"]
    )

    assert_subset(runner.run(inputs), expected)


def test_strong():
    """Test Strong Aborts"""
    runner = TestRunner("Abort")
    runner.setup()

    inputs = [
        {"A": False, "Strong": False, "Weak": False, "Join": False},
        {"A": True, "Strong": True, "Weak": False, "Join": False},
        {"A": False, "Strong": False, "Weak": False, "Join": False},
    ]

    expected = generate_expected(
        "Abort", inputs, ["A", "Join", "Weak", "Strong", "O1", "OJ", "OW", "OS"]
    )

    assert_subset(runner.run(inputs), expected)


def test_weak():
    """Test Weak Aborts"""
    runner = TestRunner("Abort")
    runner.setup()

    inputs = [
        {"A": False, "Strong": False, "Weak": False, "Join": False},
        {"A": True, "Strong": False, "Weak": True, "Join": False},
        {"A": False, "Strong": False, "Weak": False, "Join": False},
    ]

    expected = generate_expected(
        "Abort", inputs, ["A", "Join", "Weak", "Strong", "O1", "OJ", "OW", "OS"]
    )

    assert_subset(runner.run(inputs), expected)
