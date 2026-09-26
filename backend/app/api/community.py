from fastapi import APIRouter, Query
import networkx as nx

from app.services.graph_builder import build_graph
from app.services.community_detector import detect_louvain

router = APIRouter()


@router.get("/investigation")
def community_investigation(
    community: str | None = Query(default=None)
):
    """
    Return structural investigation metrics for detected communities.

    This endpoint analyzes the supplied network graph and does not infer
    real-world behavior from community membership.
    """
    graph, df = build_graph()
    partition = detect_louvain(graph)

    grouped = {}
    for node, community_id in partition.items():
        grouped.setdefault(str(community_id), []).append(node)

    result = []

    selected_ids = (
        [str(community)]
        if community is not None and str(community) in grouped
        else sorted(grouped.keys(), key=lambda value: int(value))
    )

    for community_id in selected_ids:
        members = sorted(grouped[community_id])
        member_set = set(members)

        internal_edges = []
        external_edges = []
        external_nodes = set()

        for _, row in df.iterrows():
            source = str(row["source"])
            target = str(row["target"])

            source_in = source in member_set
            target_in = target in member_set

            payload = {
                "source": source,
                "target": target,
                "relationship": str(row.get("relationship", "relationship")),
                "timestamp": str(row.get("timestamp", "")),
                "weight": float(row.get("weight", 1)),
            }

            if source_in and target_in:
                internal_edges.append(payload)
            elif source_in or target_in:
                external_edges.append(payload)
                external_nodes.add(target if source_in else source)

        possible_internal_edges = len(members) * (len(members) - 1) / 2
        density = (
            len(internal_edges) / possible_internal_edges
            if possible_internal_edges
            else 0.0
        )

        degrees = [graph.degree(node) for node in members]
        average_degree = (
            sum(degrees) / len(degrees)
            if degrees
            else 0.0
        )

        relationship_types = {}
        for edge in internal_edges:
            relationship_type = edge["relationship"]
            relationship_types[relationship_type] = (
                relationship_types.get(relationship_type, 0) + 1
            )

        result.append({
            "community": community_id,
            "members": members,
            "member_count": len(members),
            "internal_edges": len(internal_edges),
            "external_edges": len(external_edges),
            "external_nodes": len(external_nodes),
            "internal_density": round(float(density), 6),
            "average_degree": round(float(average_degree), 6),
            "relationship_types": relationship_types,
            "internal_relationships": internal_edges,
            "external_relationships": external_edges,
        })

    return {
        "communities": result,
        "count": len(result),
        "network_nodes": graph.number_of_nodes(),
        "network_edges": graph.number_of_edges(),
    }
