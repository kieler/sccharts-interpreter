import argparse
import subprocess
import sys
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Run integration tests")
    parser.add_argument("tests", nargs="*", default=["all"])
    args = parser.parse_args()

    if "all" in args.tests:
        scripts_dir = Path(__file__).parent / "scripts"
        script_names = sorted(str(s.stem) for s in scripts_dir.glob("*.py"))
    else:
        script_names = args.tests

    failed_count = 0
    results = []
    try:
        scripts_dir = Path(__file__).parent / "scripts"

        for name in script_names:
            script_path = str(scripts_dir / f"{name}.py")
            print()
            print("=" * 60)
            print(f"Test: {name}")
            print("=" * 60)

            scripts_dir = Path(__file__).parent / "scripts"
            tests_dir = Path(__file__).parent

            res = subprocess.run(
                ["uv", "run", script_path],
                cwd=str(tests_dir),
                capture_output=True,
                text=True,
            )

            if res.stdout:
                print(res.stdout.rstrip())
            if res.stderr:
                print(res.stderr.rstrip(), file=sys.stderr)

            passed = res.returncode == 0
            results.append((name, passed))
            status = "PASS" if passed else "FAIL"
            print(f"[{status}] {name}")
            print("=" * 60)

        total = len(results)
        passed_count = sum(1 for _, p in results if p)
        failed_count = total - passed_count

        print()
        print("-" * 60)
        print("Summary:")
        print(f"  Total:  {total}")
        print(f"  Passed: {passed_count}")
        print(f"  Failed: {failed_count}")
        print("-" * 60)

    except Exception as error:
        print(error)

    sys.exit(1 if failed_count else 0)


if __name__ == "__main__":
    main()
