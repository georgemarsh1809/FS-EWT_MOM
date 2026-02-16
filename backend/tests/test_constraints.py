import pytest
from fastapi.testclient import TestClient

from app.config import TOTAL_IN_YTD, TOTAL_OUT_YTD
from app.constraints import compute_stock_bounds, compute_variance_pct_max
from app.main import app


def test_variance_pct_max_from_ytd():
    variance_pct_max = compute_variance_pct_max(TOTAL_IN_YTD, TOTAL_OUT_YTD)
    expected = abs(TOTAL_OUT_YTD - TOTAL_IN_YTD) / TOTAL_IN_YTD
    assert variance_pct_max == pytest.approx(expected)


def test_stock_bounds_rounding():
    variance_pct_max = compute_variance_pct_max(TOTAL_IN_YTD, TOTAL_OUT_YTD)
    lower, upper = compute_stock_bounds(100, variance_pct_max)
    assert lower == 99
    assert upper == 101


def test_variance_pct_above_max_rejected():
    variance_pct_max = compute_variance_pct_max(TOTAL_IN_YTD, TOTAL_OUT_YTD)
    client = TestClient(app)
    payload = {
        "scope_id": "p1_p9_avg",
        "inputs": {
            "consolidation": {"pallets_in": 10, "pallets_out": 10},
            "groupage": {"pallets_in": 10, "pallets_out": 10},
            "stock": {"pallets_in": 100, "pallets_out": 100},
        },
        "stock_flow_constraint": {
            "enabled": True,
            "variance_pct": variance_pct_max + 0.01
        }
    }
    response = client.post("/api/scenario/run", json=payload)
    assert response.status_code == 422


def test_stock_out_out_of_bounds_rejected():
    variance_pct_max = compute_variance_pct_max(TOTAL_IN_YTD, TOTAL_OUT_YTD)
    client = TestClient(app)
    lower, upper = compute_stock_bounds(100, variance_pct_max)
    payload = {
        "scope_id": "p1_p9_avg",
        "inputs": {
            "consolidation": {"pallets_in": 10, "pallets_out": 10},
            "groupage": {"pallets_in": 10, "pallets_out": 10},
            "stock": {"pallets_in": 100, "pallets_out": upper + 1},
        },
        "stock_flow_constraint": {
            "enabled": True,
            "variance_pct": variance_pct_max
        }
    }
    response = client.post("/api/scenario/run", json=payload)
    assert response.status_code == 422
