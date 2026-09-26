from fastapi import APIRouter

import networkx as nx

from app.services.graph_builder import build_graph
from app.services.community_detector import detect_louvain
from app.services.centrality_engine import calculate
from app.services.anomaly_detector import detect
from app.services.temporal_engine import snapshot_stats


router = APIRouter()


# =========================================================
# BASIC NETWORK SUMMARY
# =========================================================

@router.get("/summary")
def summary():
    G, _ = build_graph()

    partition = detect_louvain(G)

    return {
        "nodes": G.number_of_nodes(),
        "edges": G.number_of_edges(),
        "communities": len(set(partition.values())),
        "density": round(nx.density(G), 6),
        "components": nx.number_connected_components(G),
    }


# =========================================================
# NETWORK INTELLIGENCE
# =========================================================

@router.get("/intelligence")
def intelligence():
    G, df = build_graph()

    # -----------------------------------------------------
    # Community detection
    # -----------------------------------------------------

    partition = detect_louvain(G)

    community_sizes = {}

    for node, community_id in partition.items():
        community_sizes.setdefault(
            str(community_id),
            0
        )

        community_sizes[str(community_id)] += 1

    # -----------------------------------------------------
    # Centrality analysis
    # -----------------------------------------------------

    centrality = calculate(G)

    top_degree = sorted(
        centrality.items(),
        key=lambda item: item[1]["degree"],
        reverse=True
    )[:5]

    top_betweenness = sorted(
        centrality.items(),
        key=lambda item: item[1]["betweenness"],
        reverse=True
    )[:5]

    # -----------------------------------------------------
    # Structural anomaly analysis
    # -----------------------------------------------------

    anomaly_results = detect(G)

    top_anomalies = []

    for item in anomaly_results[:5]:
        top_anomalies.append({
            "node": item["node"],
            "anomaly_score": float(
                item.get("anomaly_score", 0.0)
            ),
            "is_anomaly": bool(
                item.get("is_anomaly", False)
            ),
        })

    # -----------------------------------------------------
    # Network structure
    # -----------------------------------------------------

    components = nx.number_connected_components(G)

    largest_component = 0

    if G.number_of_nodes() > 0:
        largest_component = max(
            (
                len(component)
                for component in nx.connected_components(G)
            ),
            default=0
        )

    largest_component_percentage = (
        (largest_component / G.number_of_nodes()) * 100
        if G.number_of_nodes() > 0
        else 0
    )

    # -----------------------------------------------------
    # Temporal overview
    # -----------------------------------------------------

    temporal = snapshot_stats(df)

    timeline = temporal.get("timeline", [])

    busiest_period = None

    if timeline:
        busiest_period = max(
            timeline,
            key=lambda item: item["records"]
        )

    # -----------------------------------------------------
    # Return intelligence snapshot
    # -----------------------------------------------------

    return {
        "network": {
            "nodes": G.number_of_nodes(),
            "edges": G.number_of_edges(),
            "density": round(
                nx.density(G),
                6
            ),
            "communities": len(
                set(partition.values())
            ),
            "components": components,
        },

        "communities": {
            "count": len(
                set(partition.values())
            ),
            "sizes": community_sizes,
        },

        "centrality": {
            "top_degree": [
                {
                    "node": node,
                    "value": round(
                        float(values["degree"]),
                        6
                    ),
                }
                for node, values in top_degree
            ],

            "top_betweenness": [
                {
                    "node": node,
                    "value": round(
                        float(
                            values["betweenness"]
                        ),
                        6
                    ),
                }
                for node, values in top_betweenness
            ],
        },

        "anomalies": top_anomalies,

        "connectivity": {
            "components": components,
            "largest_component": largest_component,
            "largest_component_percentage": round(
                largest_component_percentage,
                2
            ),
        },

        "temporal": {
            "periods": len(timeline),
            "busiest_period": (
                busiest_period["period"]
                if busiest_period
                else None
            ),
            "busiest_period_records": (
                busiest_period["records"]
                if busiest_period
                else 0
            ),
        },
    }