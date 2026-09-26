from pathlib import Path
import pandas as pd
import networkx as nx

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "raw" / "relationships.csv"

def load_dataframe(path=DATA_PATH):
    return pd.read_csv(path)

def build_graph(path=DATA_PATH):
    df = load_dataframe(path)
    G = nx.Graph()
    for _, r in df.iterrows():
        u, v = str(r["source"]), str(r["target"])
        G.add_node(u, node_type="entity")
        G.add_node(v, node_type="entity")
        G.add_edge(
            u, v,
            relationship=str(r.get("relationship", "associated")),
            timestamp=str(r.get("timestamp", "")),
            weight=float(r.get("weight", 1))
        )
    return G, df
