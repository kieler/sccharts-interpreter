"""
Plot log files from test runs using matplotlib.

Usage example:
    >>> from testing.log2graph import log_to_graph
    >>> log_to_graph(
    ...     "logs/custom/steam_boiler.json",
    ...     {
    ...         "WaterLevel": ("bar", "blue"),
    ...         "Mode": ("line", "green"),
    ...         "M1": ("line", "red", "dashed"),
    ...     },
    ...     output_path="output.png",
    ... )

Plot spec format (simplified):
    variable -> (plot_type, color_or_args...)
        plot_type: 'bar' or 'line'
        color: string passed as the 'color' kwarg
        linestyle (only for line): optional 3rd element ('-', '--', etc.)

For more control, pass a dict of keyword arguments instead:
    >>> log_to_graph(
    ...     "logs/custom/steam_boiler.json",
    ...     {
    ...         "WaterLevel": ("bar", {"color": "blue", "alpha": 0.6}),
    ...         "Mode": ("line", {"color": "green", "linewidth": 2}),
    ...         "M1": ("line", {"color": "red", "linestyle": "--"}),
    ...     },
    ... )

Multiple bars draw on top of each other at the same x position.
Each variable gets its own y-axis scale by default.
Use the 'axis' attribute to share a secondary axis between variables:

    >>> log_to_graph(
    ...     "logs/custom/steam_boiler.json",
    ...     {
    ...         "WaterLevel": ("bar", {"color": "blue"}),
    ...         "M1": ("line", {"color": "red", "axis": "shared"}),
    ...         "Mode": ("line", {"color": "green", "axis": "shared"}),
    ...     },
    ... )

Bar groups (when there are multiple bar variables):
    - All bars draw centered at the same x tick (overlaid by default).
    - Use 'width' in attrs to control bar width.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Literal, Tuple

import matplotlib.pyplot as plt
import numpy as np

PlotType = Literal["bar", "line"]


def _resolve_labelstyle(style) -> dict[str, Any]:
    """Convert a shorthand labelstyle (str/tuple) to matplotlib font dict."""
    if style is None:
        return {}
    if isinstance(style, str):
        props: dict[str, Any] = {}
        if "bold" in style.lower():
            props["weight"] = "bold"
        if "italic" in style.lower():
            props["style"] = "italic"
        if "underline" in style.lower():
            props["fontproperties"] = None  # placeholder; handled separately
        return props
    if isinstance(style, tuple):
        props: dict[str, Any] = {}
        for s in style:
            props.update(_resolve_labelstyle(s))
        return props
    return {}


def log_to_graph(
    log_path: str | Path,
    plot_spec: Any,
    output_path: str | Path = "output.png",
    title: str = "",
    legend_kwargs: dict[str, Any] | None = None,
) -> None:
    """Create a matplotlib figure from a test run log file.

    Args:
        log_path: Path to the JSON log file (e.g. from create_custom_log).
        plot_spec: Dict mapping variable names to plot config.
            See module docstring for accepted formats.
        output_path: Where to save the PNG image.
        title: Figure title (defaults to "Test Run Results").
        legend_kwargs: Optional dict of keyword arguments passed to
            ``matplotlib.axes.Axes.legend()`` (e.g. ``{"title": "Legend"}``,
            ``{"fontsize": 10, "loc": "upper left"}``). Use the per-variable
            ``"label"`` key in a plot config to customise individual legend labels.

    Raises:
        FileNotFoundError: If log_path doesn't exist.
        ValueError: If log file is empty or plot_spec has invalid entries.
    """
    # ---- load data ----
    log_file = Path(log_path)
    if not log_file.exists():
        raise FileNotFoundError(f"Log file not found: {log_file}")

    with open(log_file) as f:
        entries = json.load(f)

    if not entries:
        raise ValueError("Log file contains no data.")

    # Handle both new wrapper format {"outputs": [...], "model_info": ...} and legacy flat list.
    if isinstance(entries, dict) and "outputs" in entries:
        entries = entries["outputs"]

    n_ticks = len(entries)

    # ---- normalize plot spec into (type, attrs_dict, axis_key, label_style) ----
    normalized: List[
        Tuple[str, PlotType, Dict[str, Any], str | None, dict[str, Any] | None]
    ] = []  # name, type, attrs, axis, label_style
    for name in plot_spec:
        value = plot_spec[name]
        if isinstance(value, tuple):
            ptype = value[0]
            if ptype not in ("bar", "line"):
                raise ValueError(f"Invalid plot type '{ptype}' for variable '{name}'.")

            attrs: Dict[str, Any] = {}
            if len(value) >= 2:
                color_arg = value[1]
                if isinstance(color_arg, dict):
                    # Already a kwarg dict — pass through directly
                    attrs.update(color_arg)
                else:
                    # Simple color string
                    attrs["color"] = color_arg

            if len(value) >= 3 and ptype == "line":
                attrs["linestyle"] = value[2]
        elif isinstance(value, dict):
            ptype = value.get("type", "line")
            if ptype not in ("bar", "line"):
                raise ValueError(f"Invalid plot type '{ptype}' for variable '{name}'.")
            attrs = dict(value)  # shallow copy
        else:
            raise ValueError(
                f"Invalid spec for variable '{name}': expected tuple or dict, got {type(value).__name__}"
            )

        # Resolve label (defaults to variable name) and optional labelstyle
        if "label" not in attrs:
            attrs["label"] = name
        ls = attrs.pop("labelstyle", None)
        label_style: dict[str, Any] | None = None
        if ls is not None:
            label_style = _resolve_labelstyle(ls)

        axis_key = attrs.pop("axis", None)
        normalized.append((name, ptype, attrs, axis_key, label_style))

    # ---- build figure with potentially multiple y-axes ----
    num_bars = sum(1 for _, t, *_ in normalized if t == "bar")
    bar_width = 0.5

    has_secondary = any(_[3] is not None for _ in normalized)
    fig_height = min(max(6, n_ticks / 4), 10)
    fig_width = min(max(12, n_ticks / 4), 20)

    fig = plt.figure(figsize=(fig_width, fig_height))

    if has_secondary:
        ax_primary = fig.add_subplot(111)
        axes_by_key: Dict[str | None, plt.Axes] = {None: ax_primary}
        seen_keys: set[str | None] = {None}

        for name, ptype, attrs, axis_key, _label_style in normalized:
            if axis_key is not None and axis_key not in seen_keys:
                ax_new = ax_primary.twinx()
                axes_by_key[axis_key] = ax_new
                seen_keys.add(axis_key)
    else:
        ax_primary = fig.add_subplot(111)
        axes_by_key = {None: ax_primary}

    # ---- collect data series ----
    series_map: Dict[str, np.ndarray] = {}
    for name, ptype, attrs, axis_key, _label_style in normalized:
        series_map[name] = _extract_series(entries, name)

    # ---- plot each variable ----
    for name, ptype, attrs, axis_key, label_style in normalized:
        ax = axes_by_key[axis_key]
        x = np.arange(n_ticks)
        y = series_map[name]

        if ptype == "bar":
            bar_attrs = {k: v for k, v in attrs.items()}
            if num_bars > 1 and "width" not in bar_attrs:
                bar_attrs["width"] = bar_width / num_bars
            ax.bar(x, y, **bar_attrs)
        elif ptype == "line":
            line_attrs = {k: v for k, v in attrs.items()}
            if "linestyle" not in line_attrs and "ls" not in line_attrs:
                line_attrs["linestyle"] = "-"
            ax.plot(x, y, **line_attrs)

    # ---- formatting ----
    ax_primary.set_xbound(0, n_ticks)
    ax_primary.set_xlabel("Tick")
    ax_primary.set_ylabel("Primary Scale")
    ax_primary.set_title(title or "Test Run Results")
    ax_primary.grid(True, alpha=0.3)

    # ---- legend (merged from all axes) ----
    ordered_handles: list = []
    ordered_labels_text: list[str] = []
    ordered_styles: list[dict[str, Any] | None] = []

    for name, ptype, attrs, axis_key, label_style in normalized:
        if name not in series_map:
            continue
        h_list, l_list = axes_by_key[axis_key].get_legend_handles_labels()
        legend_label = attrs.get("label", name)
        if legend_label in l_list:
            i = l_list.index(legend_label)
            ordered_handles.append(h_list[i])
            ordered_labels_text.append(l_list[i])
            ordered_styles.append(label_style)

    if ordered_labels_text:
        default_legend_kwargs: dict[str, Any] = {"loc": "best"}
        merged_kwargs = {**default_legend_kwargs, **(legend_kwargs or {})}
        leg = ax_primary.legend(ordered_handles, ordered_labels_text, **merged_kwargs)
        # Apply per-label font properties via legend.get_texts()
        texts = leg.get_texts()
        for text_item, style in zip(texts, ordered_styles):
            if style is not None:
                props = text_item.get_fontproperties().copy()
                if "weight" in style:
                    props.set_weight(style["weight"])
                if "style" in style:
                    props.set_style(style["style"])
                text_item.set_fontproperties(props)

    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)


def _extract_series(entries: list[dict[str, Any]], var_name: str) -> np.ndarray:
    """Extract a numpy array of values for *var_name* across all ticks."""
    series = []
    for entry in entries:
        # Support both {"variables": {...}} and flat dict formats
        variables = entry.get("variables", entry)
        val = variables.get(var_name)
        if val is None:
            series.append(np.nan)
        else:
            try:
                series.append(float(val))
            except (TypeError, ValueError):
                series.append(np.nan)
    return np.array(series)


def extract_ticktimes(entries: list[dict[str, Any]]) -> np.ndarray:
    """Extract ticktime values from a single log file.

    Args:
        entries: Parsed JSON log entries (list of dicts) - will auto-unwrap
            the {"outputs": [...], "model_info": ...} wrapper if present.

    Returns:
        numpy array of ticktime values in microseconds.
    """
    # Auto-unwrap new log format if a list was not passed directly.
    if isinstance(entries, dict) and "outputs" in entries:
        entries = entries["outputs"]

    values: list[float] = []
    for entry in entries:
        telemetry = entry.get("telemetry", entry)
        val = telemetry.get("ticktime")

        if val is None:
            continue
        values.append(float(val))

    return np.array(values)


def plot_timings(
    log_configs: list[tuple[str | Path, str] | tuple[str | Path,]],
    output_path: str | Path = "timing_comparison.png",
) -> None:
    """Compare mean ticktime across multiple log files.

    Produces a single bar chart with one bar per file (mean ± std dev).

    Args:
        log_configs: List of ``(log_path)`` or ``(log_path, label)`` tuples.
        The optional third element is the x-axis label; when omitted it
        falls back to the file stem.
        output_path: Where to save the PNG image.
    """
    if not log_configs:
        raise ValueError(
            "log_configs must contain at least one (path, source_type) tuple."
        )

    # ---- extract timing data per file ----
    ticks_per_file = []
    labels = []
    for entry in log_configs:
        p = Path(entry[0])
        if not p.exists():
            raise FileNotFoundError(f"Log file not found: {p}")
        with open(p) as f:
            entries = json.load(f)
        if isinstance(entries, dict) and "outputs" in entries:
            entries = entries["outputs"]
        ticks = extract_ticktimes(entries)
        if len(ticks) == 0:
            raise ValueError(f"No ticktime values found in {p}.")
        ticks_per_file.append(ticks)
        labels.append(entry[2] if len(entry) > 2 else p.stem)
    fig, ax = plt.subplots(figsize=(10, 6))

    n_files = len(ticks_per_file)
    x_ticks = np.arange(n_files)

    means = [t.mean() for t in ticks_per_file]
    stds = [t.std() if len(t) > 1 else 0.0 for t in ticks_per_file]

    ax.bar(x_ticks, means, yerr=stds, capsize=4)
    for i, m in enumerate(means):
        ax.text(
            i + 0.23,
            m * 1.02,
            f"{m:,.5f} ms",
            ha="center",
            va="bottom",
            fontdict={"fontsize": 12},
        )
    ax.set_xticks(x_ticks)
    ax.set_xticklabels(labels, fontsize=10)
    ax.set_ylabel("Mean tick time (ms)")
    ax.set_title("Mean ticktime")
    ax.grid(True, axis="y", alpha=0.3)
    ax.set_yscale("log")

    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)
