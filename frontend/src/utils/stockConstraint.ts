export const clamp = (value: number, lower: number, upper: number) => {
  if (!Number.isFinite(value)) {
    return lower;
  }
  return Math.min(upper, Math.max(lower, value));
};

export const computeStockBounds = (stockIn: number, variancePct: number) => {
  const variance = Math.max(0, variancePct);
  const lower = Math.floor(stockIn * (1 - variance));
  const upper = Math.ceil(stockIn * (1 + variance));
  return {
    lower: Math.max(0, lower),
    upper: Math.max(0, upper)
  };
};
