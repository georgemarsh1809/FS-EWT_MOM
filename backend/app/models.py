from __future__ import annotations

from typing import Dict, Literal

from pydantic import BaseModel, Field, field_validator

WorkType = Literal["consolidation", "groupage", "stock"]


class RatesPerType(BaseModel):
    wh_rev_per_in_pallet: float
    wh_cost_per_in_pallet: float
    trans_rev_per_out_pallet: float
    trans_cost_per_out_pallet: float
    wh_margin_per_in_pallet: float
    trans_margin_per_out_pallet: float


class RatesResponse(BaseModel):
    scope_id: str
    scope_label: str
    types: Dict[WorkType, RatesPerType]


class ScopeItem(BaseModel):
    id: str
    label: str


class ScenarioInputs(BaseModel):
    pallets_in: int = Field(ge=0)
    pallets_out: int = Field(ge=0)

    @field_validator("pallets_in", "pallets_out", mode="before")
    @classmethod
    def coerce_non_negative_int(cls, value):
        if value is None:
            return 0
        try:
            coerced = int(round(float(value)))
        except (TypeError, ValueError):
            raise ValueError("Value must be a number")
        if coerced < 0:
            raise ValueError("Value must be >= 0")
        return coerced


class ScenarioRunRequest(BaseModel):
    scope_id: str
    inputs: Dict[WorkType, ScenarioInputs]


class ScenarioTypeResult(BaseModel):
    pallets_in: int
    pallets_out: int
    wh_revenue: float
    wh_cost: float
    wh_margin: float
    trans_revenue: float
    trans_cost: float
    trans_margin: float
    total_revenue: float
    total_cost: float
    total_margin: float
    wh_margin_per_in_pallet: float
    trans_margin_per_out_pallet: float
    blended_margin_per_total_pallets: float


class ScenarioTotals(BaseModel):
    total_revenue: float
    total_cost: float
    total_margin: float
    overall_margin_pct: float


class ScenarioRunResponse(BaseModel):
    scope_id: str
    scope_label: str
    per_type: Dict[WorkType, ScenarioTypeResult]
    totals: ScenarioTotals
