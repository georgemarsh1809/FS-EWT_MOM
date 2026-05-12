from __future__ import annotations

from typing import Dict

from .models import ScenarioRunResponse, ScenarioTotals, ScenarioTypeResult, WorkType


def calculate_scenario(scope_id: str, scope_label: str, rates: Dict[WorkType, dict], inputs: Dict[WorkType, dict]) -> ScenarioRunResponse:
    per_type: Dict[WorkType, ScenarioTypeResult] = {}
    total_revenue = 0.0
    total_cost = 0.0
    total_margin = 0.0

    for work_type, rate in rates.items():
        input_row = inputs.get(work_type)
        pallets_in = int(input_row["pallets_in"])
        pallets_out = int(input_row["pallets_out"])

        wh_revenue = pallets_in * rate["wh_rev_per_in_pallet"]
        wh_cost = pallets_in * rate["wh_cost_per_in_pallet"]
        wh_margin = wh_revenue - wh_cost

        trans_revenue = pallets_out * rate["trans_rev_per_out_pallet"]
        trans_cost = pallets_out * rate["trans_cost_per_out_pallet"]
        trans_margin = trans_revenue - trans_cost

        total_type_revenue = wh_revenue + trans_revenue
        total_type_cost = wh_cost + trans_cost
        total_type_margin = total_type_revenue - total_type_cost

        blended_denominator = max(1, pallets_in + pallets_out)
        blended_margin = total_type_margin / blended_denominator

        per_type[work_type] = ScenarioTypeResult(
            pallets_in=pallets_in,
            pallets_out=pallets_out,
            wh_revenue=wh_revenue,
            wh_cost=wh_cost,
            wh_margin=wh_margin,
            trans_revenue=trans_revenue,
            trans_cost=trans_cost,
            trans_margin=trans_margin,
            total_revenue=total_type_revenue,
            total_cost=total_type_cost,
            total_margin=total_type_margin,
            wh_margin_per_in_pallet=rate["wh_rev_per_in_pallet"] - rate["wh_cost_per_in_pallet"],
            trans_margin_per_out_pallet=rate["trans_rev_per_out_pallet"] - rate["trans_cost_per_out_pallet"],
            blended_margin_per_total_pallets=blended_margin,
        )

        total_revenue += total_type_revenue
        total_cost += total_type_cost
        total_margin += total_type_margin

    overall_margin_pct = total_margin / max(1.0, total_revenue)

    totals = ScenarioTotals(
        total_revenue=total_revenue,
        total_cost=total_cost,
        total_margin=total_margin,
        overall_margin_pct=overall_margin_pct,
    )

    return ScenarioRunResponse(
        scope_id=scope_id,
        scope_label=scope_label,
        per_type=per_type,
        totals=totals,
    )
