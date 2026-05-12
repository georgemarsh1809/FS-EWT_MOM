import json
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ["PASSWORDS"] = "password123:test-token-from-password,admin:admin-token"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"

from app.main import app

client = TestClient(app)


def test_login_success():
    response = client.post("/login", json={"password": "password123"})
    assert response.status_code == 200
    data = response.json()
    assert data["token"] == "test-token-from-password"


def test_login_invalid_password():
    response = client.post("/login", json={"password": "wrong-password"})
    assert response.status_code == 401


def test_defaults_p12_with_valid_token():
    response = client.get(
        "/defaults/p12",
        headers={"Authorization": "Bearer test-token-from-password"},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "consol_trans_rev" in data


def test_defaults_p10_with_valid_token():
    response = client.get(
        "/defaults/p10",
        headers={"Authorization": "Bearer admin-token"},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)


def test_defaults_without_token():
    response = client.get("/defaults/p12")
    assert response.status_code == 401


def test_defaults_invalid_preset():
    response = client.get(
        "/defaults/p99",
        headers={"Authorization": "Bearer test-token-from-password"},
    )
    assert response.status_code == 404


def test_defaults_with_token_from_password_login():
    login_response = client.post("/login", json={"password": "admin"})
    assert login_response.status_code == 200
    token = login_response.json()["token"]

    defaults_response = client.get(
        "/defaults/p12",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert defaults_response.status_code == 200
