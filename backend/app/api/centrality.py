from fastapi import APIRouter
from app.services.graph_builder import build_graph
from app.services.centrality_engine import calculate

router = APIRouter()

@router.get("")
def centrality():
    G, _ = build_graph()
    values = calculate(G)
    rows = [{"node": n, **v} for n, v in values.items()]
    rows.sort(key=lambda x: x["betweenness"], reverse=True)
    return {"results": rows}
