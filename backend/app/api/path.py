from fastapi import APIRouter, HTTPException, Query
import networkx as nx

from app.services.graph_builder import build_graph

router = APIRouter()


@router.get("/shortest")
def shortest_path(
    source: str = Query(..., min_length=1),
    target: str = Query(..., min_length=1),
):
    """
    Find the shortest structural path between two nodes.

    The NetworkTrace graph is treated as an undirected relationship
    network for traversal. Relationship records are returned for
    every hop in the discovered path.
    """
    source = str(source).strip()
    target = str(target).strip()

    if not source or not target:
        raise HTTPException(
            status_code=400,
            detail="Source and target nodes are required.",
        )

    if source == target:
        return {
            "source": source,
            "target": target,
            "exists": True,
            "connected": True,
            "path": [source],
            "path_length": 0,
            "nodes_in_path": 1,
            "hops": [],
            "message": "Source and target are the same node.",
        }

    graph, df = build_graph()

    if source not in graph:
        raise HTTPException(
            status_code=404,
            detail=f"Source node '{source}' was not found.",
        )

    if target not in graph:
        raise HTTPException(
            status_code=404,
            detail=f"Target node '{target}' was not found.",
        )

    try:
        path = nx.shortest_path(
            graph,
            source=source,
            target=target,
        )
    except nx.NetworkXNoPath:
        return {
            "source": source,
            "target": target,
            "exists": True,
            "connected": False,
            "path": [],
            "path_length": None,
            "nodes_in_path": 0,
            "hops": [],
            "message": "No path exists between the selected nodes.",
        }

    hops = []

    for index in range(len(path) - 1):
        current = path[index]
        next_node = path[index + 1]

        matches = df[
            (
                (df["source"].astype(str) == current)
                & (df["target"].astype(str) == next_node)
            )
            |
            (
                (df["source"].astype(str) == next_node)
                & (df["target"].astype(str) == current)
            )
        ]

        relationships = []

        for _, row in matches.iterrows():
            relationship_source = str(row["source"])
            relationship_target = str(row["target"])

            relationships.append(
                {
                    "source": relationship_source,
                    "target": relationship_target,
                    "relationship": str(row.get("relationship", "")),
                    "timestamp": str(row.get("timestamp", "")),
                    "weight": float(row.get("weight", 1)),
                    "direction": (
                        "outgoing"
                        if relationship_source == current
                        else "incoming"
                    ),
                }
            )

        hops.append(
            {
                "from": current,
                "to": next_node,
                "relationships": relationships,
            }
        )

    return {
        "source": source,
        "target": target,
        "exists": True,
        "connected": True,
        "path": path,
        "path_length": len(path) - 1,
        "nodes_in_path": len(path),
        "hops": hops,
        "message": "Shortest path found.",
    }
