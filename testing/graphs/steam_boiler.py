from log2graph import log_to_graph

log_to_graph(
    "./logs/custom/steam_boiler.json",
    {
        "WaterLevel": ("bar", {"color": "blue", "alpha": 0.7}),
        "Mode": ("line", {"color": "green", "axis": "mode", "linewidth": 3}),
        "M1": (
            "line",
            {"color": "red", "linewidth": 1, "linestyle": "dashed"},
        ),
        "M2": (
            "line",
            {"color": "red", "linewidth": 1, "linestyle": "dashed"},
        ),
        "N1": (
            "line",
            {
                "color": "orange",
                "linewidth": 1,
                "linestyle": "dashed",
            },
        ),
        "N2": (
            "line",
            {
                "color": "orange",
                "linewidth": 1,
                "linestyle": "dashed",
            },
        ),
    },
    "./graphs/steam_boiler.png",
    "Steam Boiler",
)

log_to_graph(
    "./logs/custom/steam_boiler_comp.json",
    {
        "WaterLevel": ("bar", {"color": "blue", "alpha": 0.7}),
        "Mode": ("line", {"color": "green", "axis": "mode", "linewidth": 3}),
        "M1": (
            "line",
            {"color": "red", "linewidth": 1, "linestyle": "dashed"},
        ),
        "M2": (
            "line",
            {"color": "red", "linewidth": 1, "linestyle": "dashed"},
        ),
        "N1": (
            "line",
            {
                "color": "orange",
                "linewidth": 1,
                "linestyle": "dashed",
            },
        ),
        "N2": (
            "line",
            {
                "color": "orange",
                "linewidth": 1,
                "linestyle": "dashed",
            },
        ),
    },
    "./graphs/steam_boiler_comp.png",
    "Steam Boiler Compiled Version",
)

log_to_graph(
    "./logs/custom/steam_boiler_exp.json",
    {
        "WaterLevel": ("bar", {"color": "blue", "alpha": 0.7}),
        "Mode": ("line", {"color": "green", "axis": "mode", "linewidth": 3}),
        "M1": (
            "line",
            {"color": "red", "linewidth": 1, "linestyle": "dashed"},
        ),
        "M2": (
            "line",
            {"color": "red", "linewidth": 1, "linestyle": "dashed"},
        ),
        "N1": (
            "line",
            {
                "color": "orange",
                "linewidth": 1,
                "linestyle": "dashed",
            },
        ),
        "N2": (
            "line",
            {
                "color": "orange",
                "linewidth": 1,
                "linestyle": "dashed",
            },
        ),
    },
    "./graphs/steam_boiler_exp.png",
    "Steam Boiler Expanded Version",
)
