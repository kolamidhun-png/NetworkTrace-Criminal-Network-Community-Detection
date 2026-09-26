import networkx as nx

try:
    import community.community_louvain as community_louvain
except ImportError:
    community_louvain = None

def detect_louvain(G):
    if community_louvain:
        return community_louvain.best_partition(G, weight="weight", random_state=42)
    # deterministic fallback for environments without python-louvain
    communities = list(nx.connected_components(G))
    return {n: i for i, c in enumerate(communities) for n in c}

def detect_girvan_newman(G, k=3):
    comp = nx.community.girvan_newman(G)
    try:
        groups = next((x for x in comp if len(x) >= k))
    except StopIteration:
        groups = tuple(nx.connected_components(G))
    return {n: i for i, group in enumerate(groups) for n in group}
