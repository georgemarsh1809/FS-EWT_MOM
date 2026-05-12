from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .auth import PASSWORD_TO_TOKEN, log_auth_config, verify_token
from .calculations import calculate_scenario
from .models import (
    LoginRequest,
    LoginResponse,
    RatesResponse,
    ScenarioRunRequest,
    ScenarioRunResponse,
    ScopeItem,
)
from .rates import get_rates, list_scopes, load_rates_raw


@asynccontextmanager
async def lifespan(app: FastAPI):
    log_auth_config()
    yield


app = FastAPI(
    title="Pallet Mix Scenario Modeller API",
    version="0.1.0",
    lifespan=lifespan,
)

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest) -> LoginResponse:
    if request.password not in PASSWORD_TO_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")
    return LoginResponse(token=PASSWORD_TO_TOKEN[request.password])


@app.get("/defaults/{preset}")
async def get_defaults(preset: str, _: str = Depends(verify_token)) -> dict:
    if preset not in ("p10", "p12"):
        raise HTTPException(status_code=404, detail="Preset not found")

    defaults_path = Path(__file__).parent.parent / "data" / f"q1-{preset}-defaults.json"
    if not defaults_path.exists():
        raise HTTPException(status_code=404, detail="Preset not found")

    with open(defaults_path) as f:
        return json.load(f)


@app.get("/api/rates/scopes", response_model=list[ScopeItem])
async def rates_scopes(_: str = Depends(verify_token)):
    return list_scopes()


@app.get("/api/rates", response_model=RatesResponse)
async def rates(scope: str, _: str = Depends(verify_token)):
    try:
        return get_rates(scope)
    except KeyError:
        raise HTTPException(status_code=404, detail="Scope not found")


@app.post("/api/scenario/run", response_model=ScenarioRunResponse)
async def scenario_run(payload: ScenarioRunRequest, _: str = Depends(verify_token)):
    data = load_rates_raw()
    if payload.scope_id not in data:
        raise HTTPException(status_code=404, detail="Scope not found")

    scope = data[payload.scope_id]
    rates = scope["types"]
    inputs = {key: payload.inputs[key].model_dump() for key in rates.keys()}

    return calculate_scenario(payload.scope_id, scope["label"], rates, inputs)
