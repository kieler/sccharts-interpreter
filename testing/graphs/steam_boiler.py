from log2graph import log_to_graph, plot_timings

if __name__ == "__main__":
    log_to_graph(
        "./logs/custom/steam_boiler.json",
        {
            "WaterLevel": (
                "bar",
                {"color": "blue", "alpha": 0.7, "label": "Water Level"},
            ),
            "Mode": (
                "line",
                {
                    "color": "green",
                    "axis": "mode",
                    "linewidth": 3,
                    "label": "Operating Mode",
                    "labelstyle": "bold",
                },
            ),
            "M1": (
                "line",
                {
                    "color": "red",
                    "linewidth": 1,
                    "linestyle": "--",
                    "label": "M1",
                    "labelstyle": "italic",
                },
            ),
            "M2": (
                "line",
                {
                    "color": "red",
                    "linewidth": 1,
                    "linestyle": "--",
                    "label": "M2",
                },
            ),
            "N1": (
                "line",
                {
                    "color": "orange",
                    "linewidth": 1,
                    "linestyle": "--",
                    "label": "N1",
                    "labelstyle": "italic",
                },
            ),
            "N2": (
                "line",
                {
                    "color": "orange",
                    "linewidth": 1,
                    "linestyle": "--",
                    "label": "N2",
                    "labelstyle": "italic",
                },
            ),
        },
        "./graphs/steam_boiler.png",
        "Steam Boiler",
        legend_kwargs={
            "title": "System State Legend",
            "fontsize": 11,
            "loc": "upper left",
        },
    )

    log_to_graph(
        "./logs/custom/steam_boiler_comp.json",
        {
            "WaterLevel": (
                "bar",
                {"color": "blue", "alpha": 0.7, "label": "Water Level"},
            ),
            "Mode": (
                "line",
                {
                    "color": "green",
                    "axis": "mode",
                    "linewidth": 3,
                    "label": "Operating Mode",
                    "labelstyle": "bold",
                },
            ),
            "M1": (
                "line",
                {
                    "color": "red",
                    "linewidth": 1,
                    "linestyle": "--",
                    "label": "M1",
                    "labelstyle": "italic",
                },
            ),
            "M2": (
                "line",
                {
                    "color": "red",
                    "linewidth": 1,
                    "linestyle": "--",
                    "label": "M2",
                },
            ),
            "N1": (
                "line",
                {
                    "color": "orange",
                    "linewidth": 1,
                    "linestyle": "--",
                    "label": "N1",
                    "labelstyle": "italic",
                },
            ),
            "N2": (
                "line",
                {
                    "color": "orange",
                    "linewidth": 1,
                    "linestyle": "--",
                    "label": "N2",
                    "labelstyle": "italic",
                },
            ),
        },
        "./graphs/steam_boiler_comp.png",
        "Steam Boiler Compiled Version",
        legend_kwargs={
            "title": "System State Legend",
            "fontsize": 11,
            "loc": "upper left",
        },
    )

    log_to_graph(
        "./logs/custom/steam_boiler_exp.json",
        {
            "WaterLevel": (
                "bar",
                {"color": "blue", "alpha": 0.7, "label": "Water Level"},
            ),
            "Mode": (
                "line",
                {
                    "color": "green",
                    "axis": "mode",
                    "linewidth": 3,
                    "label": "Operating Mode",
                    "labelstyle": "bold",
                },
            ),
            "M1": (
                "line",
                {
                    "color": "red",
                    "linewidth": 1,
                    "linestyle": "--",
                    "label": "M1",
                    "labelstyle": "italic",
                },
            ),
            "M2": (
                "line",
                {
                    "color": "red",
                    "linewidth": 1,
                    "linestyle": "--",
                    "label": "M2",
                },
            ),
            "N1": (
                "line",
                {
                    "color": "orange",
                    "linewidth": 1,
                    "linestyle": "--",
                    "label": "N1",
                    "labelstyle": "italic",
                },
            ),
            "N2": (
                "line",
                {
                    "color": "orange",
                    "linewidth": 1,
                    "linestyle": "--",
                    "label": "N2",
                    "labelstyle": "italic",
                },
            ),
        },
        "./graphs/steam_boiler_exp.png",
        "Steam Boiler Expanded Version",
        legend_kwargs={
            "title": "System State Legend",
            "fontsize": 11,
            "loc": "upper left",
        },
    )

    plot_timings(
        [
            ("./logs/custom/steam_boiler.json", "Custom Expansion"),
            ("./logs/custom/steam_boiler_comp.json", "Compiled Version"),
            (
                "./logs/custom/steam_boiler_exp.json",
                "KiCo expanded version with Interpreter",
            ),
        ],
        "./graphs/steam_boiler_time_comparison.png",
    )
