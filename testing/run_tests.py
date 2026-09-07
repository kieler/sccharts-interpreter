import argparse
import os
import sys
from pathlib import Path

import pytest


def main() -> None:
    parser = argparse.ArgumentParser(description="Run integration tests with pytest")
    _ = parser.add_argument(
        "tests",
        nargs="*",
        default=["all"],
        help='Test names (e.g. "abo ao im") or "all"',
    )
    _ = parser.add_argument(
        "--reset-exe",
        required=False,
        default=False,
        action="store_true",
        help="Recompile the EXE",
    )
    _ = parser.add_argument(
        "--reset-json",
        required=False,
        default=False,
        action="store_true",
        help="Recompile the JSON",
    )
    _ = parser.add_argument(
        "--langium",
        required=False,
        default=False,
        action="store_true",
        help="Use the langium based sctx2json converter for the tests",
    )
    _ = parser.add_argument(
        "--cache-langium",
        required=False,
        default=False,
        action="store_true",
        help="Cache the sctx2json convertion results",
    )

    args, extra = parser.parse_known_args()

    if args.reset_exe:
        os.environ["FORCE_RESET_EXE"] = "1"
    if args.reset_json:
        os.environ["FORCE_RESET_JSON"] = "1"
    if args.langium:
        os.environ["LANGIUM"] = "1"
    if args.cache_langium:
        os.environ["CACHE_LANGIUM_JSON"] = "1"

    tests_dir = Path(__file__).parent / "tests"

    test_paths = []
    pytest_extra = ["-v"]

    # Pass through --langium and --no-ktraces as-is for conftest to pick up
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
