# NetworkTrace — Criminal Network Community Detection

> An educational graph-analytics platform for exploring communities, centrality, structural anomaly signals, temporal network behavior, shortest paths, and network changes through What-If simulation.

🌐 **Live Application:** https://network-trace-criminal-network-comm.vercel.app/

🔗 **Backend API:** https://networktrace-api.onrender.com/

📦 **GitHub Repository:** https://github.com/kolamidhun-png/NetworkTrace-Criminal-Network-Community-Detection

---

## 📌 Overview

**NetworkTrace** is a full-stack graph analytics platform designed to analyze relationship networks represented as graphs.

The system transforms relationship records into a graph where:

- **Nodes** represent entities.
- **Edges** represent relationships between entities.
- **Communities** represent densely connected groups.
- **Centrality metrics** identify structurally important nodes.
- **Anomaly detection** identifies unusual structural patterns.
- **Temporal analysis** shows how the network changes over time.
- **Shortest-path investigation** explores paths between selected nodes.
- **What-If simulation** evaluates structural changes after removing a node.

The current demonstration dataset is synthetic and is intended for educational and technical demonstration purposes.

> ⚠️ **Important:** NetworkTrace produces structural indicators and analytical signals. These outputs are **not proof of criminal activity** and should not be used to accuse or make decisions about real people.

---

## ✨ Key Features

### 🕸️ Interactive Network Graph

Visualizes the relationship network using **Cytoscape.js**.

Features include:

- Interactive node exploration
- Relationship visualization
- Community-based highlighting
- Network structure exploration
- Centrality information
- Anomaly information
- Path visualization

---

### 🧩 Community Detection

NetworkTrace uses the **Louvain community detection algorithm** to identify groups of nodes with stronger internal connectivity.

The dashboard displays:

- Community IDs
- Community members
- Community sizes
- Community distribution
- Community highlighting

Community detection helps reveal structural groups within the network.

---

### 📊 Centrality Analysis

NetworkTrace calculates multiple graph centrality measures:

- Degree Centrality
- Betweenness Centrality
- Closeness Centrality
- Eigenvector Centrality

These metrics provide different perspectives on structural importance within the network.

#### Degree Centrality

Measures the connectivity of a node based on its relationships.

#### Betweenness Centrality

Measures how frequently a node occurs on shortest paths between other nodes.

#### Closeness Centrality

Measures how close a node is to other nodes through shortest paths.

#### Eigenvector Centrality

Measures structural importance based on connections to other important nodes.

---

### 🚨 Structural Anomaly Detection

NetworkTrace uses **Isolation Forest** to identify unusual structural patterns.

The dashboard provides:

- Anomaly scores
- Signal classification
- Ranked anomaly candidates

These are structural anomaly signals and should not be interpreted as evidence of wrongdoing.

---

### 🕒 Temporal Network Analysis

NetworkTrace analyzes how the network changes across time.

Users can:

- Select a start date
- Select an end date
- Filter relationships
- View active nodes
- View relationship counts
- View network density
- View connected components
- Inspect monthly network snapshots
- View temporal charts

---

### 🧪 What-If Network Simulation

The What-If Simulator evaluates the structural effect of removing a selected node.

It compares:

- Nodes before and after
- Relationships before and after
- Communities before and after
- Connected components before and after
- Network density before and after

This provides a controlled way to study network sensitivity.

---

### 🛣️ Shortest-Path Investigation

The Path Investigation module allows users to select two nodes and analyze the shortest path between them.

It helps explore:

- Path length
- Intermediate nodes
- Network connectivity
- Structural relationships

---

### 📁 Dataset Management

NetworkTrace supports relationship data represented in CSV format.

Example:

```text
source,target,relationship,timestamp,weight
P001,P002,communication,2026-01-05,1
P002,P003,financial,2026-01-07,2
P003,P004,association,2026-01-12,1