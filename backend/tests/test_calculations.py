from app.calculations import calculate_scenario


def test_calculate_scenario_totals():
    rates = {
        "consolidation": {
            "wh_rev_per_in_pallet": 10.0,
            "wh_cost_per_in_pallet": 6.0,
            "trans_rev_per_out_pallet": 20.0,
            "trans_cost_per_out_pallet": 12.0,
        },
        "groupage": {
            "wh_rev_per_in_pallet": 8.0,
            "wh_cost_per_in_pallet": 5.0,
            "trans_rev_per_out_pallet": 16.0,
            "trans_cost_per_out_pallet": 10.0,
        },
        "stock": {
            "wh_rev_per_in_pallet": 12.0,
            "wh_cost_per_in_pallet": 7.0,
            "trans_rev_per_out_pallet": 18.0,
            "trans_cost_per_out_pallet": 11.0,
        },
    }

    inputs = {
        "consolidation": {"pallets_in": 10, "pallets_out": 5},
        "groupage": {"pallets_in": 4, "pallets_out": 6},
        "stock": {"pallets_in": 8, "pallets_out": 2},
    }

    result = calculate_scenario("test", "Test", rates, inputs)

    # Consolidation totals
    cons = result.per_type["consolidation"]
    assert cons.wh_revenue == 100.0
    assert cons.wh_cost == 60.0
    assert cons.trans_revenue == 100.0
    assert cons.trans_cost == 60.0
    assert cons.total_margin == 80.0

    # Overall totals
    assert result.totals.total_revenue == 100.0 + 100.0 + 32.0 + 96.0 + 96.0 + 36.0
    assert result.totals.total_cost == 60.0 + 60.0 + 20.0 + 60.0 + 56.0 + 22.0
    assert result.totals.total_margin == result.totals.total_revenue - result.totals.total_cost
