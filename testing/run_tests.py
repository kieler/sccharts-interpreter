import argparse
import os
import sys
from pathlib import Path

import pytest


def main() -> None:
    parser = argparse.ArgumentParser(description="Run integration tests with pytest")
    parser.add_argument(
        "tests",
        nargs="*",
        default=["all"],
        help='Test names (e.g. "abo ao im") or "all"',
    )
    parser.add_argument(
        "-r",
        "--reset",
        required=False,
        default=False,
        action="store_true",
        help="Always recompile the JSON and EXE",
    )
    args, extra = parser.parse_known_args()

    if args.reset:
        os.environ["FORCE_RESET"] = "1"

    tests_dir = Path(__file__).parent / "tests"

    test_paths = []
    pytest_extra = ["-v"]

    # Pass through --langium and --no-ktraces as-is for conftest to pick up
    if "--langium" in extra:
        pytest_extra.append("--langium")
    if "--no-ktraces" in extra:
        pytest_extra.append("--no-ktraces")

    if "all" in args.tests:
        test_paths = ["tests/"]
    else:
        for name in args.tests:
            matches = sorted(tests_dir.glob(f"*{name}*.py"))
            if not matches:
                print(f"Error: no test files matching '{name}'")
                sys.exit(1)
            test_paths.extend(str(m) for m in matches)

    sys.exit(pytest.main([*pytest_extra, *test_paths]))


if __name__ == "__main__":
    main()
