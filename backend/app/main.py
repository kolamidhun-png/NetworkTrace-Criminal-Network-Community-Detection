import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    graph,
    communities,
    centrality,
    anomalies,
    temporal,
    simulation,
    analytics,
    dataset,
    community,
    relationships,
    path,
)


def get_cors_origins():
    raw_origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )

    return [
        origin.strip()
        for origin in raw_origins.split(",")
        if origin.strip()
    ]


app = FastAPI(
    title="NetworkTrace API",
    version="1.0.0",
    description=(
        "Graph analytics platform using "
        "synthetic/anonymized network data."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    graph.router,
    prefix="/api/graph",
    tags=["Graph"],
)

app.include_router(
    communities.router,
    prefix="/api/communities",
    tags=["Communities"],
)

app.include_router(
    centrality.router,
    prefix="/api/centrality",
    tags=["Centrality"],
)

app.include_router(
    anomalies.router,
    prefix="/api/anomalies",
    tags=["Anomalies"],
)

app.include_router(
    temporal.router,
    prefix="/api/temporal",
    tags=["Temporal"],
)

app.include_router(
    simulation.router,
    prefix="/api/simulation",
    tags=["Simulation"],
)

app.include_router(
    analytics.router,
    prefix="/api/analytics",
    tags=["Analytics"],
)

app.include_router(
    dataset.router,
    prefix="/api",
    tags=["Dataset"],
)

app.include_router(
    community.router,
    prefix="/api/community",
    tags=["Community Investigation"],
)

app.include_router(
    relationships.router,
    prefix="/api/relationships",
    tags=["Relationships"],
)

app.include_router(
    path.router,
    prefix="/api/path",
    tags=["Path Investigation"],
)


@app.get("/")
def root():
    return {
        "name": "NetworkTrace",
        "status": "running",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "NetworkTrace API",
    }