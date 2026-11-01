"""Ticktime performance analysis by model category.

Category definitions live in CATEGORIES below — a list of (label, filter) tuples.
Add or remove entries to change which box plots appear.

``filter`` is a function(model_info) -> bool that decides whether the model
belongs in this category.  ``model_info`` is the 'model_info' dict from your
kico log files — fields may be missing, so always use .get() with defaults.
"""

import json
import os
from typing import Callable

import numpy as np
from log2graph import extract_ticktimes
from matplotlib import pyplot as plt

# ── CATEGORY DEFINITIONS ───────────────────────────────────────────────
# (label, model_info -> bool) tuples — add/remove freely.
CATEGORIES: list[tuple[str, Callable[[dict], bool]]] = [
    ("All models", lambda mi: True),
    ("States >= 5", lambda mi: mi.get("states", 0) >= 5),
    ("States < 5", lambda mi: mi.get("states", 0) < 5),
    ("Transitions >= 4", lambda mi: mi.get("transitions", 0) >= 4),
    ("Transitions < 4", lambda mi: mi.get("transitions", 0) < 4),
    ("Variables >= 4", lambda mi: mi.get("variables", 0) >= 4),
    ("Variables < 4", lambda mi: mi.get("variables", 0) < 4),
    ("Uses reference charts", lambda mi: mi.get("uses_reference_charts") is True),
]

# ── MAIN ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.join(script_dir, "..")

    interpreter_dir = os.path.join(base_dir, "logs", "interpreter")
    compiler_dir = os.path.join(base_dir, "logs", "kico")

    interpreter_logs = set(os.listdir(interpreter_dir))
    compiler_logs = set(os.listdir(compiler_dir))

    # Collect per-model data
    model_data: list[dict] = []

    for log in sorted(interpreter_logs):
        if log not in compiler_logs:
            print(f"Interpreter log {log} not in compiler logs.")
            continue

        with open(os.path.join(interpreter_dir, log)) as f:
            data_interp = json.load(f)
            interpreter_times = np.array(extract_ticktimes(data_interp))

        with open(os.path.join(compiler_dir, log)) as f:
            data_kico = json.load(f)
            kico_times = np.array(extract_ticktimes(data_kico))
            model_info = data_kico.get("model_info", {})

        if len(interpreter_times) != len(kico_times):
            print(f"Log {log} has unequal log lengths")
            continue

        times_ratio = interpreter_times / kico_times
        timing_means = np.mean(times_ratio)
        model_data.append(
            {
                "filename": log,
                "timing_means": timing_means,
                "model_info": model_info,
            }
        )

    # Gather data per category
    cat_data: list[tuple[str, np.ndarray]] = []
    for label, filt in CATEGORIES:
        filtered = [d["timing_means"] for d in model_data if filt(d["model_info"])]
        cat_data.append((label, np.array(filtered)))

    # Print summary
    for label, vals in cat_data:
        n = len(vals)
        print(
            f"{label}: {n} models, median={np.median(vals):.3f}, std={np.std(vals):.3f}"
        )

    # ── Plot ───────────────────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(12, 7), dpi=300)

    box_positions = list(range(len(cat_data)))
    all_values = (
        np.concatenate([vals for _, vals in cat_data])
        if any(len(v) > 0 for _, v in cat_data)
        else np.array([1.0])
    )

    bp = ax.boxplot(
        [vals for _, vals in cat_data],
        positions=box_positions,
        widths=0.6,
        patch_artist=True,
        showfliers=False,
        whiskerprops=dict(linewidth=1.2),
        medianprops=dict(color="darkred", linewidth=1.5),
        flierprops=dict(markeredgecolor="red"),
    )

    colors = [
        "#74add1",
        "#f46d43",
        "#4dafb2",
        "#e0e0e0",
        "#8dd3c7",
        "#ff7f00",
        "#98df8a",
        "#ff69b4",
        "#bcbd22",
        "#1f77b4",
    ]
    for patch, color in zip(bp["boxes"], colors):
        patch.set_facecolor(color)

    counts = [len(vals) for _, vals in cat_data]

    # Y-axis: auto-range based on data percentiles
    q_lo = np.percentile(all_values, 2) if len(all_values) > 0 else 1
    q_hi = np.percentile(all_values, 98) if len(all_values) > 0 else 100
    ax.set_ylim(0, 7000)

    xtick_labels = []
    for i, (label, _) in enumerate(cat_data):
        xtick_labels.append(f"{label}\n(n={counts[i]})")

    ax.set_xticks(box_positions)
    ax.set_xticklabels(xtick_labels, rotation=45, ha="right", fontsize=9)
    ax.set_ylabel("Relative Performance\n(Interpreter / Compiler)")
    ax.set_title("Per-Category Relative Ticktime Performance")
    ax.grid(True, axis="y", alpha=0.3)

    fig.tight_layout()
    out_path = os.path.join(script_dir, "ticktime_all.png")
    fig.savefig(out_path, dpi=300)
    print(f"Saved to {out_path}")
