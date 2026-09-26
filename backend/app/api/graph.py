from fastapi import APIRouter
from app.services.graph_builder import build_graph

router = APIRouter()

@router.get("")
def get_graph():
    G, _ = build_graph()
    return {
        "nodes": [{"id": n, **G.nodes[n]} for n in G.nodes],
        "edges": [{"source": u, "target": v, **d} for u, v, d in G.edges(data=True)]
    }
