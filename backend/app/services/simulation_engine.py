import networkx as nx
from .centrality_engine import calculate
from .community_detector import detect_louvain

def summary(G):
    communities = detect_louvain(G)
    return {
        "nodes": G.number_of_nodes(),
        "edges": G.number_of_edges(),
        "density": round(nx.density(G), 6) if G.number_of_nodes() > 1 else 0,
        "communities": len(set(communities.values())),
        "components": nx.number_connected_components(G),
    }

def remove_node_simulation(G, node):
    before = summary(G)
    H = G.copy()
    if node in H:
        H.remove_node(node)
    after = summary(H)
    return {"node": node, "exists": node in G, "before": before, "after": after}
