from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.graph_builder import build_graph
from app.services.simulation_engine import remove_node_simulation

router = APIRouter()

class RemoveNodeRequest(BaseModel):
    node: str

@router.post("/remove-node")
def remove_node(payload: RemoveNodeRequest):
    G, _ = build_graph()
    if payload.node not in G:
        raise HTTPException(status_code=404, detail="Node not found")
    return remove_node_simulation(G, payload.node)
