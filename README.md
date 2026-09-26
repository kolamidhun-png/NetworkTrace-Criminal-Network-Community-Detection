# NetworkTrace — Criminal Network Community Detection

NetworkTrace is an educational graph-analytics platform for analyzing synthetic or legally obtained/anonymized relationship data. It detects communities, calculates network centrality, identifies structural anomaly signals, performs temporal analysis, and provides a What-If node-removal simulator.

> The project is designed for network analysis. Scores and indicators are not proof of criminal activity and should not be used to accuse real people.

## Stack
- Backend: Python, FastAPI, NetworkX, scikit-learn, Pandas
- Frontend: React + Vite
- Visualization: Cytoscape.js
- Optional advanced graph stack: Leiden/igraph
- Data: CSV synthetic relationship data

## Features
1. Graph construction from CSV
2. Louvain community detection
3. Optional Leiden/Girvan-Newman adapters
4. Degree, betweenness, closeness and eigenvector centrality
5. Isolation Forest structural anomaly signals
6. Temporal filtering
7. What-If node removal simulation
8. REST API
9. React dashboard
10. Synthetic data generation

## Run Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Backend: http://127.0.0.1:8000
Docs: http://127.0.0.1:8000/docs

## Run Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

## API examples
- GET /api/health
- GET /api/graph
- GET /api/communities
- GET /api/centrality
- GET /api/anomalies
- GET /api/temporal
- POST /api/simulation/remove-node
- GET /api/analytics/summary

## Dataset
The included dataset is synthetic and contains relationship records only for demonstration.
