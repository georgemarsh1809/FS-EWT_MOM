from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Dict

from .models import RatesPerType, RatesResponse, ScopeItem, WorkType

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "rates.json"


@lru_cache(maxsize=1)
def load_rates_raw() -> dict:
    with DATA_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def list_scopes() -> list[ScopeItem]:
    data = load_rates_raw()
    return [ScopeItem(id=scope_id, label=scope_data["label"]) for scope_id, scope_data in data.items()]


def get_rates(scope_id: str) -> RatesResponse:
    data = load_rates_raw()
    if scope_id not in data:
        raise KeyError(scope_id)

    scope = data[scope_id]
    types: Dict[WorkType, RatesPerType] = {}
    for work_type, rate in scope["types"].items():
        wh_margin = rate["wh_rev_per_in_pallet"] - rate["wh_cost_per_in_pallet"]
        trans_margin = rate["trans_rev_per_out_pallet"] - rate["trans_cost_per_out_pallet"]
        types[work_type] = RatesPerType(
            wh_rev_per_in_pallet=rate["wh_rev_per_in_pallet"],
            wh_cost_per_in_pallet=rate["wh_cost_per_in_pallet"],
            trans_rev_per_out_pallet=rate["trans_rev_per_out_pallet"],
            trans_cost_per_out_pallet=rate["trans_cost_per_out_pallet"],
            wh_margin_per_in_pallet=wh_margin,
            trans_margin_per_out_pallet=trans_margin,
        )

    return RatesResponse(scope_id=scope_id, scope_label=scope["label"], types=types)
