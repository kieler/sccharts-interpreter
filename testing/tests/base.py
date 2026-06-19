import json
from pathlib import Path
from typing import Any

import requests

URL = "http://localhost:19339"
BASE_DIR = Path(__file__).parent.parent.resolve()


def load_model(name: str) -> list[dict[str, Any]]:
    path = BASE_DIR / "example-sctx" / f"{name}.json"
    with open(path) as f:
        return json.load(f)


class TestRunner:
    __test__ = False

    def __init__(self, name: str):
        self.name = name
        self.model = load_model(name)

    def setup(self) -> requests.Response:
        resp = requests.post(f"{URL}/setup", json={"model": self.model})
        assert resp.status_code == 200, (
            f"{resp.status_code}, Setup failed for {self.name}: {resp.text}"
        )
        return resp

    def run(self, inputs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        resp = requests.get(f"{URL}/reset")
        assert resp.status_code == 200, (
            f"{resp.status_code}, Reset failed for {self.name}: {resp.text}"
        )

        output = []
        for i, inp in enumerate(inputs):
            resp = requests.post(f"{URL}/tick", json={"inputs": inp})
            assert resp.status_code == 200, (
                f"{resp.status_code}, Tick {i} failed for {self.name}: {resp.text}"
            )
            output.append(resp.json())

            if resp.json().get("terminated"):
                break

        return output
