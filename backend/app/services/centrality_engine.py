import networkx as nx

def calculate(G):
    result = {}
    degree = nx.degree_centrality(G)
    betweenness = nx.betweenness_centrality(G, weight="weight", normalized=True)
    closeness = nx.closeness_centrality(G)
    try:
        eigen = nx.eigenvector_centrality_numpy(G, weight="weight")
    except Exception:
        eigen = {n: 0.0 for n in G.nodes}
    for n in G.nodes:
        result[n] = {
            "degree": round(degree.get(n, 0), 6),
            "betweenness": round(betweenness.get(n, 0), 6),
            "closeness": round(closeness.get(n, 0), 6),
            "eigenvector": round(eigen.get(n, 0), 6),
        }
    return result
