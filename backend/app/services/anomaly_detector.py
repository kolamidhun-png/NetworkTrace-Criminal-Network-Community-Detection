import pandas as pd
from sklearn.ensemble import IsolationForest
from .centrality_engine import calculate

def detect(G):
    centrality = calculate(G)
    rows = []
    for n, c in centrality.items():
        rows.append({
            "node": n,
            "degree": c["degree"],
            "betweenness": c["betweenness"],
            "closeness": c["closeness"],
            "eigenvector": c["eigenvector"],
            "raw_degree": G.degree(n),
        })
    df = pd.DataFrame(rows)
    if len(df) < 5:
        df["anomaly_score"] = 0.0
        df["is_anomaly"] = False
        return df.to_dict("records")
    X = df[["degree", "betweenness", "closeness", "eigenvector", "raw_degree"]]
    model = IsolationForest(contamination="auto", random_state=42, n_estimators=150)
    labels = model.fit_predict(X)
    scores = -model.score_samples(X)
    df["anomaly_score"] = scores.round(5)
    df["is_anomaly"] = labels == -1
    return df.sort_values("anomaly_score", ascending=False).to_dict("records")
