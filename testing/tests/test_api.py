"""
Tests for the REST API server.
Uses the model ABO as a simple example where
not the interpreter should be at fault if it fails.
"""

import subprocess
import time
from pathlib import Path

import pytest
import requests

from tests.base import TestRunner
from tests.utils import assert_subset

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "ABO.sctx"
API_URL = "http://localhost:19339"


@pytest.fixture(scope="module")
def api_server():
    proc = subprocess.Popen(
        ["node", str(BASE_DIR.parent / "dist" / "api_server.js")],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    deadline = time.time() + 5.0
    while time.time() < deadline:
        try:
            if requests.get(f"{API_URL}/ping", timeout=1).status_code == 200:
                break
        except Exception:
            pass
        time.sleep(0.3)
    else:
        proc.kill()
        raise RuntimeError("API server did not start in time")

    yield proc

    try:
        requests.get(f"{API_URL}/shutdown", timeout=3)
    except Exception:
        pass
    proc.wait(timeout=5)


def test_setup_sctx(api_server):
    resp = requests.post(
        f"{API_URL}/setup",
        json={
            "format": "sctx",
            "content": MODEL_PATH.read_text(),
            "filePath": str(MODEL_PATH),
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["message"] == "Setup successful"
    assert data["model"] == "ABO"


def test_tick_abo_A_first(api_server):
    requests.post(
        f"{API_URL}/setup",
        json={
            "format": "sctx",
            "content": MODEL_PATH.read_text(),
            "filePath": str(MODEL_PATH),
        },
    )

    inputs = [
        {"A": False, "B": False},
        {"A": True, "B": False},
        {"A": False, "B": True},
        {"A": False, "B": False},
    ]

    actual = []
    for inp in inputs:
        resp = requests.post(f"{API_URL}/tick", json={"inputs": inp})
        assert resp.status_code == 200
        actual.append(resp.json())
        if resp.json()["terminated"]:
            break

    runner = TestRunner(str(MODEL_PATH.with_suffix("")))
    expected = runner.generate_expected(inputs, ["A", "B", "O1", "O2"])
    assert_subset(actual, expected)


def test_tick_abo_B_first(api_server):
    requests.post(
        f"{API_URL}/setup",
        json={
            "format": "sctx",
            "content": MODEL_PATH.read_text(),
            "filePath": str(MODEL_PATH),
        },
    )

    inputs = [
        {"A": False, "B": False},
        {"A": False, "B": True},
        {"A": True, "B": False},
        {"A": False, "B": False},
    ]

    actual = []
    for inp in inputs:
        resp = requests.post(f"{API_URL}/tick", json={"inputs": inp})
        assert resp.status_code == 200
        actual.append(resp.json())
        if resp.json()["terminated"]:
            break

    runner = TestRunner(str(MODEL_PATH.with_suffix("")))
    expected = runner.generate_expected(inputs, ["A", "B", "O1", "O2"])
    assert_subset(actual, expected)


def test_reset(api_server):
    requests.post(
        f"{API_URL}/setup",
        json={
            "format": "sctx",
            "content": MODEL_PATH.read_text(),
            "filePath": str(MODEL_PATH),
        },
    )

    # tick past termination
    requests.post(f"{API_URL}/tick", json={"inputs": {"A": True, "B": False}})
    requests.post(f"{API_URL}/tick", json={"inputs": {"A": False, "B": True}})
    requests.post(f"{API_URL}/tick", json={"inputs": {"A": False, "B": False}})

    resp = requests.post(f"{API_URL}/reset")
    assert resp.status_code == 200
    assert resp.json()["message"] == "Reset successful"
