import networkx as nx
import pandas as pd


def snapshot_stats(df, start=None, end=None):
    """
    Calculate temporal network statistics for NetworkTrace.

    The dataset is expected to contain:
    source, target, timestamp, relationship, weight
    """

    work = df.copy()

    if work.empty:
        return {
            "records": 0,
            "nodes": 0,
            "edges": 0,
            "start": start,
            "end": end,
            "timeline": [],
        }

    # Convert timestamp column to datetime
    work["timestamp"] = pd.to_datetime(
        work["timestamp"],
        errors="coerce"
    )

    # Remove rows with invalid timestamps
    work = work.dropna(subset=["timestamp"])

    # Apply date filters
    if start:
        start_date = pd.to_datetime(start, errors="coerce")

        if pd.notna(start_date):
            work = work[work["timestamp"] >= start_date]

    if end:
        end_date = pd.to_datetime(end, errors="coerce")

        if pd.notna(end_date):
            work = work[work["timestamp"] <= end_date]

    # Overall statistics
    nodes = set(work["source"]).union(set(work["target"]))

    overall_graph = nx.Graph()

    for _, row in work.iterrows():
        overall_graph.add_edge(
            row["source"],
            row["target"],
            weight=row.get("weight", 1)
        )

    overall_density = (
        nx.density(overall_graph)
        if overall_graph.number_of_nodes() > 1
        else 0.0
    )

    overall_components = (
        nx.number_connected_components(overall_graph)
        if overall_graph.number_of_nodes() > 0
        else 0
    )

    # Monthly temporal timeline
    work["period"] = work["timestamp"].dt.to_period("M")

    timeline = []

    for period, group in work.groupby("period", sort=True):

        graph = nx.Graph()

        for _, row in group.iterrows():
            graph.add_edge(
                row["source"],
                row["target"],
                weight=row.get("weight", 1)
            )

        period_nodes = set(group["source"]).union(
            set(group["target"])
        )

        density = (
            nx.density(graph)
            if graph.number_of_nodes() > 1
            else 0.0
        )

        components = (
            nx.number_connected_components(graph)
            if graph.number_of_nodes() > 0
            else 0
        )

        timeline.append({
            "period": str(period),
            "records": int(len(group)),
            "nodes": int(len(period_nodes)),
            "edges": int(len(group)),
            "density": round(float(density), 6),
            "components": int(components),
        })

    return {
        "records": int(len(work)),
        "nodes": int(len(nodes)),
        "edges": int(len(work)),
        "density": round(float(overall_density), 6),
        "components": int(overall_components),
        "start": start,
        "end": end,
        "timeline": timeline,
    }