import json
from pathlib import Path
from typing import Any

import requests
from requests.models import Response

url = "http://localhost:19339"


def setup(model: list[dict[str, Any]]) -> Response:
    payload = {"model": model}
    resp = requests.post(url + "/setup", json=payload)
    return resp


def tick(inputs: dict[str, Any]) -> Response:
    payload = {"inputs": inputs}
    resp = requests.post(url + "/tick", json=payload)
    return resp


script_dir = Path(__file__).parent
abo_path = script_dir.parent / "example-sctx" / "ao.json"
with open(abo_path) as f:
    model = json.load(f)

inputs = [
    {"A": False},
    {"A": False},
    {"A": True},
    {"A": False},
    {"A": False},
]

resp = setup(model)
print(resp.status_code, json.dumps(resp.json(), indent=2))

for input in inputs:
    resp = tick(input)
    if resp.status_code != 200:
        exit(1)
    print(resp.status_code, json.dumps(resp.json(), indent=2))
    if resp.json()["terminated"]:
        print(f"Final Output: {resp.json()['output']}")
        break
