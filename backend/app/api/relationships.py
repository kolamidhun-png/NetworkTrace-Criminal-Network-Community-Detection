from fastapi import APIRouter, Query
import networkx as nx
import pandas as pd

from app.services.graph_builder import build_graph
from app.services.community_detector import detect_louvain


router = APIRouter()


@router.get("/filter")
def filter_relationships(
    relationship: str | None = Query(default=None),
    node: str | None = Query(default=None),
    community: str | None = Query(default=None),
    start: str | None = Query(default=None),
    end: str | None = Query(default=None),
    min_weight: float | None = Query(default=None),
    max_weight: float | None = Query(default=None),
):
    """
    Filter network relationships using structural and temporal conditions.

    The endpoint operates on synthetic/anonymized network data.
    """

    graph, df = build_graph()

    if df.empty:
        return {
            "rows": [],
            "records": 0,
            "nodes": 0,
            "edges": 0,
            "density": 0.0,
            "components": 0,
            "relationship_types": [],
        }

    work = df.copy()

    # ---------------------------------------------------------
    # Normalize columns
    # ---------------------------------------------------------

    required_columns = [
        "source",
        "target",
        "relationship",
        "timestamp",
        "weight",
    ]

    for column in required_columns:
        if column not in work.columns:
            if column == "relationship":
                work[column] = "relationship"
            elif column == "weight":
                work[column] = 1
            else:
                work[column] = ""

    work["source"] = work["source"].astype(str)
    work["target"] = work["target"].astype(str)
    work["relationship"] = work["relationship"].astype(str)

    work["weight"] = pd.to_numeric(
        work["weight"],
        errors="coerce",
    ).fillna(1.0)

    work["timestamp"] = pd.to_datetime(
        work["timestamp"],
        errors="coerce",
    )

    # ---------------------------------------------------------
    # Relationship type filter
    # ---------------------------------------------------------

    if relationship:
        work = work[
            work["relationship"].str.lower()
            == relationship.strip().lower()
        ]

    # ---------------------------------------------------------
    # Node filter
    # ---------------------------------------------------------

    if node:
        selected_node = node.strip()

        work = work[
            (work["source"] == selected_node)
            | (work["target"] == selected_node)
        ]

    # ---------------------------------------------------------
    # Community filter
    # ---------------------------------------------------------

    if community:
        partition = detect_louvain(graph)

        selected_community = str(community)

        community_nodes = {
            str(n)
            for n, community_id in partition.items()
            if str(community_id) == selected_community
        }

        if community_nodes:
            work = work[
                work["source"].isin(community_nodes)
                | work["target"].isin(community_nodes)
            ]
        else:
            work = work.iloc[0:0]

    # ---------------------------------------------------------
    # Start date filter
    # ---------------------------------------------------------

    if start:
        start_date = pd.to_datetime(
            start,
            errors="coerce",
        )

        if pd.notna(start_date):
            work = work[
                work["timestamp"] >= start_date
            ]

    # ---------------------------------------------------------
    # End date filter
    # ---------------------------------------------------------

    if end:
        end_date = pd.to_datetime(
            end,
            errors="coerce",
        )

        if pd.notna(end_date):
            # Include the complete end date
            if getattr(end_date, "hour", 0) == 0:
                end_date = end_date + pd.Timedelta(days=1)

            work = work[
                work["timestamp"] < end_date
            ]

    # ---------------------------------------------------------
    # Minimum weight
    # ---------------------------------------------------------

    if min_weight is not None:
        work = work[
            work["weight"] >= float(min_weight)
        ]

    # ---------------------------------------------------------
    # Maximum weight
    # ---------------------------------------------------------

    if max_weight is not None:
        work = work[
            work["weight"] <= float(max_weight)
        ]

    # ---------------------------------------------------------
    # Build filtered graph
    # ---------------------------------------------------------

    filtered_graph = nx.Graph()

    rows = []

    for _, row in work.iterrows():

        source = str(row["source"])
        target = str(row["target"])

        weight = float(row["weight"])

        timestamp = row["timestamp"]

        if pd.notna(timestamp):
            timestamp_value = timestamp.strftime(
                "%Y-%m-%d"
            )
        else:
            timestamp_value = ""

        relationship_type = str(
            row["relationship"]
        )

        filtered_graph.add_edge(
            source,
            target,
            weight=weight,
            relationship=relationship_type,
        )

        rows.append(
            {
                "source": source,
                "target": target,
                "relationship": relationship_type,
                "timestamp": timestamp_value,
                "weight": weight,
            }
        )

    # ---------------------------------------------------------
    # Summary statistics
    # ---------------------------------------------------------

    node_count = filtered_graph.number_of_nodes()
    edge_count = filtered_graph.number_of_edges()

    density = (
        nx.density(filtered_graph)
        if node_count > 1
        else 0.0
    )

    components = (
        nx.number_connected_components(
            filtered_graph
        )
        if node_count > 0
        else 0
    )

    relationship_types = sorted(
        work["relationship"]
        .dropna()
        .astype(str)
        .unique()
        .tolist()
    )

    return {
        "rows": rows,
        "records": len(rows),
        "nodes": node_count,
        "edges": edge_count,
        "density": round(float(density), 6),
        "components": components,
        "relationship_types": relationship_types,
    }