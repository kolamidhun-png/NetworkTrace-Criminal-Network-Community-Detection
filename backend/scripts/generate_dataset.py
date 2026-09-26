from pathlib import Path
import random, csv
from datetime import date, timedelta

out=Path(__file__).resolve().parents[1]/"data"/"raw"/"relationships.csv"
random.seed(42)
nodes=[f"P{i:03d}" for i in range(1,51)]
relationships=["contact","association","transfer","shared_location"]
start=date(2026,1,1)
rows=[]
seen=set()
for _ in range(250):
    a,b=random.sample(nodes,2)
    key=tuple(sorted((a,b)))
    if key in seen: continue
    seen.add(key)
    rows.append([a,b,random.choice(relationships),(start+timedelta(days=random.randint(0,120))).isoformat(),random.randint(1,8)])
with out.open("w",newline="") as f:
    w=csv.writer(f); w.writerow(["source","target","relationship","timestamp","weight"]); w.writerows(rows)
print(f"Wrote {len(rows)} relationships to {out}")
