import json
import os

import numpy as np
from log2graph import extract_ticktimes
from matplotlib import pyplot as plt

if __name__ == "__main__":
    interpreter_logs = os.listdir("./logs/interpreter/")
    compiler_logs = os.listdir("./logs/kico/")

    timing_means = []

    for log in interpreter_logs:
        if log not in compiler_logs:
            print(f"Interpreter log {log} not in compiler logs.")
            continue

        with open(f"./logs/interpreter/{log}") as f:
            data = json.load(f)
            interpreter_times = np.array(extract_ticktimes(data))

        with open(f"./logs/kico/{log}") as f:
            data = json.load(f)
            kico_times = np.array(extract_ticktimes(data))

        if len(interpreter_times) != len(kico_times):
            print(f"Log {log} has unequal log lenghts")
            continue

        times_ratio = interpreter_times / kico_times
        timing_means.append(np.mean(times_ratio))

    # print(np.mean(timing_means), np.std(timing_means))
    # print(np.min(timing_means), np.max(timing_means))

    plt.figure(figsize=(10, 7), dpi=300)

    plt.bar(
        [0, 1],
        [1, np.mean(timing_means)],
        yerr=[0, np.std(timing_means)],
        capsize=4,
    )

    # Min and Max points
    plt.scatter(
        [1, 1],
        [np.min(timing_means), np.max(timing_means)],
        marker="o",
        color="black",
    )

    plt.yscale("log")
    plt.yticks([1, 10, 100], ["1.0", "10.0", "100.0"])
    plt.xticks([0, 1], ["Compiler Simulation", "Interpreter"])
    plt.ylabel("Rlative Performance")
    plt.title("Average Relative Performance: Compiled Simulation vs Interpreter")
    plt.tight_layout()
    plt.savefig("./graphs/ticktime_all.png")
