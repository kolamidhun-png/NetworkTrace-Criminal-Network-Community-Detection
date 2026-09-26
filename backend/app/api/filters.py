from datetime import datetime
from typing import Optional

import networkx as nx
import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from app.services.graph_builder import build_graph
from app.services.community_detector import detect_louvain

router = APIRouter()


def _parse_date(value: Optional[str], field_name: str):
    if not value:
        return None

    parsed = pd.to_datetime(value, errors="coerce")

    if pd.isna(parsed):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid {field_name} date. Use YYYY-MM-DD.",
        )

    return parsed


def _serialize_date(value):
    if value is None or pd.isna(value):
        return None
    return pd.Timestamp(value).strftime("%Y-%m-%d")


@router.get("/relationships/filter")
def filter_relationships(
    relationship: Optional[str] = Query(
        default=None,
        description="Relationship type, e.g. contact or transfer.",
    ),
    node: Optional[str] = Query(
        default=None,
        description="Show relationships involving this node.",
    ),
    community: Optional[str] = Query(
        default=None,
        description="Community ID returned by community detection.",
    ),
    start: Optional[str] = Query(
        default=None,
        description="Inclusive start date in YYYY-MM-DD format.",
    ),
    end: Optional[str] = Query(
        default=None,
        description="Inclusive end date in YYYY-MM-DD format.",
    ),
    min_weight: Optional[float] = Query(
        default=None,
        ge=0,
        description="Minimum relationship weight.",
    ),
    max_weight: Optional[float] = Query(
        default=None,
        ge=0,
        description="Maximum relationship weight.",
    ),
):
    """
    Filter the active relationship dataset without modifying it.

    The endpoint is designed for NetworkTrace's graph explorer.
    It returns filtered relationship records plus graph statistics.
    """

    start_date = _parse_date(start, "start")
    end_date = _parse_date(end, "end")

    if (
        start_date is not None
        and end_date is not None
        and start_date > end_date
    ):
        raise HTTPException(
            status_code=422,
            detail="Start date cannot be later than end date.",
        )

    if (
        min_weight is not None
        and max_weight is not None
        and min_weight > max_weight
    ):
        raise HTTPException(
            status_code=422,
            detail="min_weight cannot be greater than max_weight.",
        )

    _, df = build_graph()

    if df.empty:
        return {
            "status": "success",
            "filters": {
                "relationship": relationship,
                "node": node,
                "community": community,
                "start": start,
                "end": end,
                "min_weight": min_weight,
                "max_weight": max_weight,
            },
            "records": 0,
            "nodes": 0,
            "edges": 0,
            "relationship_types": [],
            "date_range": {
                "start": None,
                "end": None,
            },
            "rows": [],
        }

    work = df.copy()

    required = {
        "source",
        "target",
        "relationship",
        "timestamp",
        "weight",
    }

    missing = required.difference(work.columns)

    if missing:
        raise HTTPException(
            status_code=500,
            detail=(
                "Active dataset is missing required columns: "
                + ", ".join(sorted(missing))
            ),
        )

    work["source"] = work["source"].astype(str).str.strip()
    work["target"] = work["target"].astype(str).str.strip()
    work["relationship"] = (
        work["relationship"].astype(str).str.strip()
    )
    work["timestamp"] = pd.to_datetime(
        work["timestamp"],
        errors="coerce",
    )
    work["weight"] = pd.to_numeric(
        work["weight"],
        errors="coerce",
    )

    work = work.dropna(
        subset=[
            "source",
            "target",
            "relationship",
            "timestamp",
            "weight",
        ]
    )

    # --------------------------------------------------------
    # Relationship type
    # --------------------------------------------------------

    if relationship:
        relationship_value = relationship.strip().lower()

        work = work[
            work["relationship"].str.lower()
            == relationship_value
        ]

    # --------------------------------------------------------
    # Node
    # --------------------------------------------------------

    if node:
        node_value = node.strip()

        work = work[
            (work["source"] == node_value)
            | (work["target"] == node_value)
        ]

    # --------------------------------------------------------
    # Date range
    # --------------------------------------------------------

    if start_date is not None:
        work = work[
            work["timestamp"] >= start_date
        ]

    if end_date is not None:
        # Make the end date inclusive through the end of the day.
        inclusive_end = end_date + pd.Timedelta(days=1)
        work = work[
            work["timestamp"] < inclusive_end
        ]

    # --------------------------------------------------------
    # Weight range
    # --------------------------------------------------------

    if min_weight is not None:
        work = work[
            work["weight"] >= min_weight
        ]

    if max_weight is not None:
        work = work[
            work["weight"] <= max_weight
        ]

    # --------------------------------------------------------
    # Community filter
    # --------------------------------------------------------

    if community is not None:
        try:
            requested_community = int(
                str(community).strip()
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail="Community must be a numeric community ID.",
            ) from exc

        graph, _ = build_graph()
        partition = detect_louvain(graph)

        community_nodes = {
            str(n)
            for n, community_id in partition.items()
            if int(community_id) == requested_community
        }

        work = work[
            work["source"].isin(community_nodes)
            | work["target"].isin(community_nodes)
        ]

    # --------------------------------------------------------
    # Build filtered graph statistics
    # --------------------------------------------------------

    graph = nx.Graph()

    for _, row in work.iterrows():
        graph.add_edge(
            row["source"],
            row["target"],
            weight=float(row["weight"]),
            relationship=row["relationship"],
            timestamp=_serialize_date(row["timestamp"]),
        )

    node_set = set(work["source"]).union(
        set(work["target"])
    )

    relationship_types = sorted(
        work["relationship"].dropna().unique().tolist()
    )

    filtered_start = (
        work["timestamp"].min()
        if not work.empty
        else None
    )

    filtered_end = (
        work["timestamp"].max()
        if not work.empty
        else None
    )

    rows = []

    for _, row in work.sort_values(
        by=["timestamp", "source", "target"],
        ascending=[True, True, True],
    ).iterrows():
        rows.append(
            {
                "source": str(row["source"]),
                "target": str(row["target"]),
                "relationship": str(row["relationship"]),
                "timestamp": _serialize_date(
                    row["timestamp"]
                ),
                "weight": float(row["weight"]),
            }
        )

    return {
        "status": "success",
        "filters": {
            "relationship": relationship,
            "node": node,
            "community": community,
            "start": start,
            "end": end,
            "min_weight": min_weight,
            "max_weight": max_weight,
        },
        "records": int(len(work)),
        "nodes": int(len(node_set)),
        "edges": int(graph.number_of_edges()),
        "density": round(
            float(nx.density(graph))
            if graph.number_of_nodes() > 1
            else 0.0,
            6,
        ),
        "components": (
            int(nx.number_connected_components(graph))
            if graph.number_of_nodes() > 0
            else 0
        ),
        "relationship_types": relationship_types,
        "date_range": {
            "start": _serialize_date(filtered_start),
            "end": _serialize_date(filtered_end),
        },
        "rows": rows,
    }
