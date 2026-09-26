from fastapi import APIRouter
from app.services.graph_builder import build_graph
from app.services.temporal_engine import snapshot_stats

router = APIRouter()

@router.get("")
def temporal(start: str | None = None, end: str | None = None):
    _, df = build_graph()
    return snapshot_stats(df, start, end)
