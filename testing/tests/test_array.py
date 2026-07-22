from base import TestRunner, assert_subset, generate_expected

# TODO: The json converter still needs array support

# def test_array_simple():
#     """Test simple Arrays"""
#     runner = TestRunner("SimpleArray")
#     runner.setup()

#     inputs = [{}, {}, {}, {}]

#     expected = generate_expected("SimpleArray", inputs, [])

#     assert_subset(runner.run(inputs), expected)
