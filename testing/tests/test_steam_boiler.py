"""
I created a variotation on the steam boiler specification to test
the interpreter. This test is only to make sure it runs and to
benchmark the performance, as it is not schedulable by KiCo
"""

import random

from tests.base import TestRunner
from tests.utils import create_custom_log


def test_steam_boiler():
    runner = TestRunner("../../models-private/sccharts/grille/SteamBoiler2/Plant")

    inputs = [{"Second": True}, {"PowerUp": True}, {}, {"PowerUp": False}] + [
        {} for _ in range(1000)
    ]

    rand = random.Random(765)
    pumpBroken = rand.randint(100, 300)
    waterLevelBroken = rand.randint(400, 700)

    inputs.insert(pumpBroken, {"SimulateDefectPump1": True})
    inputs.insert(pumpBroken + 100, {"SimulateDefectPump1": False})

    inputs.insert(waterLevelBroken, {"SimulateDefectWaterLevel": True})
    inputs.insert(waterLevelBroken + 50, {"SimulateDefectWaterLevel": False})

    # The model should go to emergency stop here
    inputs.insert(900, {"SimulateDefectSteamLevel": True})
    inputs.insert(900, {"SimulateDefectWaterLevel": True})

    result = runner.run(inputs)
    create_custom_log(result, "steam_boiler")
