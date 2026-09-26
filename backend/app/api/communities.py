from fastapi import APIRouter
from app.services.graph_builder import build_graph
from app.services.community_detector import detect_louvain, detect_girvan_newman

router = APIRouter()

@router.get("")
def communities(algorithm: str = "louvain"):
    G, _ = build_graph()
    partition = detect_girvan_newman(G) if algorithm == "girvan_newman" else detect_louvain(G)
    groups = {}
    for node, cid in partition.items():
        groups.setdefault(str(cid), []).append(node)
    return {"algorithm": algorithm, "community_count": len(groups), "communities": groups}
