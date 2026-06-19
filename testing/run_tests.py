import argparse
import sys
from pathlib import Path

import pytest


def main() -> None:
    parser = argparse.ArgumentParser(description="Run integration tests with pytest")
    parser.add_argument("tests", nargs="*", default=["all"], help='Test names (e.g. "abo ao im") or "all"')
    args = parser.parse_args()

    tests_dir = Path(__file__).parent / "tests"

    if "all" in args.tests:
        test_paths = ["tests/"]
    else:
        test_paths = []
        for name in args.tests:
            matches = sorted(tests_dir.glob(f"{name}*.py"))
            if not matches:
                print(f"Error: no test files matching '{name}'")
                sys.exit(1)
            test_paths.extend(str(m) for m in matches)

    sys.exit(pytest.main(["-v", *test_paths]))


if __name__ == "__main__":
    main()
