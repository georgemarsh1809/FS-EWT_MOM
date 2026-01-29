from __future__ import annotations

import math


def compute_variance_pct_max(total_in: int, total_out: int) -> float:
    if total_in <= 0:
        return 0.0
    return abs(total_out - total_in) / total_in


def compute_stock_bounds(stock_in: int, variance_pct: float) -> tuple[int, int]:
    variance = max(0.0, variance_pct)
    lower = math.floor(stock_in * (1 - variance))
    upper = math.ceil(stock_in * (1 + variance))
    return max(0, lower), max(0, upper)


def validate_stock_constraint(
    stock_in: int,
    stock_out: int,
    variance_pct: float,
    variance_pct_max: float
) -> None:
    if variance_pct > variance_pct_max:
        raise ValueError("variance_pct exceeds variance_pct_max")

    lower, upper = compute_stock_bounds(stock_in, variance_pct)
    if stock_out < lower or stock_out > upper:
        raise ValueError("stock_out outside allowed Stock flow range")
