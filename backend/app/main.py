from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .calculations import calculate_scenario
from .models import RatesResponse, ScenarioRunRequest, ScenarioRunResponse, ScopeItem
from .rates import get_rates, list_scopes, load_rates_raw

app = FastAPI(title="Pallet Mix Scenario Modeller API", version="0.1.0")

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/api/rates/scopes", response_model=list[ScopeItem])
async def rates_scopes():
    return list_scopes()


@app.get("/api/rates", response_model=RatesResponse)
async def rates(scope: str):
    try:
        return get_rates(scope)
    except KeyError:
        raise HTTPException(status_code=404, detail="Scope not found")


@app.post("/api/scenario/run", response_model=ScenarioRunResponse)
async def scenario_run(payload: ScenarioRunRequest):
    data = load_rates_raw()
    if payload.scope_id not in data:
        raise HTTPException(status_code=404, detail="Scope not found")

    scope = data[payload.scope_id]
    rates = scope["types"]
    inputs = {key: payload.inputs[key].model_dump() for key in rates.keys()}

    return calculate_scenario(payload.scope_id, scope["label"], rates, inputs)
