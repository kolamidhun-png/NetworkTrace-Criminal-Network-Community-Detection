from fastapi.testclient import TestClient

from app.main import app
from app.services.graph_builder import build_graph


client = TestClient(app)


# ============================================================
# GRAPH TEST
# ============================================================

def test_graph_loads():
    G, df = build_graph()

    assert G.number_of_nodes() > 0
    assert len(df) > 0


# ============================================================
# SHORTEST PATH TESTS
# ============================================================

def test_shortest_path_p004_to_p049():
    response = client.get(
        "/api/path/shortest",
        params={
            "source": "P004",
            "target": "P049",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["connected"] is True
    assert data["source"] == "P004"
    assert data["target"] == "P049"

    assert data["path"][0] == "P004"
    assert data["path"][-1] == "P049"

    assert data["path_length"] == len(data["path"]) - 1
    assert data["nodes_in_path"] == len(data["path"])
    assert len(data["hops"]) == data["path_length"]


def test_shortest_path_p001_to_p049():
    response = client.get(
        "/api/path/shortest",
        params={
            "source": "P001",
            "target": "P049",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["connected"] is True
    assert data["source"] == "P001"
    assert data["target"] == "P049"

    assert data["path"][0] == "P001"
    assert data["path"][-1] == "P049"

    assert data["path_length"] == len(data["path"]) - 1


# ============================================================
# SAME NODE TEST
# ============================================================

def test_same_source_and_target():
    response = client.get(
        "/api/path/shortest",
        params={
            "source": "P004",
            "target": "P004",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["connected"] is True
    assert data["path"] == ["P004"]
    assert data["path_length"] == 0
    assert data["nodes_in_path"] == 1
    assert data["hops"] == []


# ============================================================
# INVALID NODE TESTS
# ============================================================

def test_invalid_source_node():
    response = client.get(
        "/api/path/shortest",
        params={
            "source": "P999",
            "target": "P049",
        },
    )

    assert response.status_code == 404

    data = response.json()

    assert "P999" in data["detail"]


def test_invalid_target_node():
    response = client.get(
        "/api/path/shortest",
        params={
            "source": "P004",
            "target": "P999",
        },
    )

    assert response.status_code == 404

    data = response.json()

    assert "P999" in data["detail"]


# ============================================================
# RELATIONSHIP METADATA TEST
# ============================================================

def test_relationship_metadata_is_returned():
    response = client.get(
        "/api/path/shortest",
        params={
            "source": "P004",
            "target": "P049",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["connected"] is True
    assert len(data["hops"]) > 0

    for hop in data["hops"]:
        assert "from" in hop
        assert "to" in hop
        assert "relationships" in hop

        for relationship in hop["relationships"]:
            assert "source" in relationship
            assert "target" in relationship
            assert "relationship" in relationship
            assert "timestamp" in relationship
            assert "weight" in relationship
            assert "direction" in relationship


# ============================================================
# PATH / HOP CONSISTENCY TEST
# ============================================================

def test_path_hops_match_path_nodes():
    response = client.get(
        "/api/path/shortest",
        params={
            "source": "P004",
            "target": "P049",
        },
    )

    assert response.status_code == 200

    data = response.json()

    path = data["path"]
    hops = data["hops"]

    assert len(hops) == len(path) - 1

    for index, hop in enumerate(hops):
        assert hop["from"] == path[index]
        assert hop["to"] == path[index + 1]