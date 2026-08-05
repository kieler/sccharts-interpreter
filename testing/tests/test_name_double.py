from base import TestRunner, assert_subset, generate_expected


def test_name_double():
    """Testing that renaming of duplicate state names works.
    For the scxt converter"""
    runner = TestRunner("NameDouble")
    runner.setup()

    inputs = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]

    expected = generate_expected("NameDouble", inputs, ["O"])

    assert_subset(runner.run(inputs), expected)
