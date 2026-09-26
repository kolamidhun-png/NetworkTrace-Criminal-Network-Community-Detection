from fastapi import APIRouter
from app.services.graph_builder import build_graph
from app.services.anomaly_detector import detect

router = APIRouter()

@router.get("")
def anomalies():
    G, _ = build_graph()
    return {"results": detect(G)}
