export type WorkType = "consolidation" | "groupage" | "stock";

export type ScopeItem = {
  id: string;
  label: string;
};

export type RatesPerType = {
  wh_rev_per_in_pallet: number;
  wh_cost_per_in_pallet: number;
  trans_rev_per_out_pallet: number;
  trans_cost_per_out_pallet: number;
  wh_margin_per_in_pallet: number;
  trans_margin_per_out_pallet: number;
};

export type RatesResponse = {
  scope_id: string;
  scope_label: string;
  types: Record<WorkType, RatesPerType>;
};

export type ScenarioInputs = {
  pallets_in: number;
  pallets_out: number;
};

export type ScenarioRunRequest = {
  scope_id: string;
  inputs: Record<WorkType, ScenarioInputs>;
};

export type ScenarioTypeResult = {
  pallets_in: number;
  pallets_out: number;
  wh_revenue: number;
  wh_cost: number;
  wh_margin: number;
  trans_revenue: number;
  trans_cost: number;
  trans_margin: number;
  total_revenue: number;
  total_cost: number;
  total_margin: number;
  wh_margin_per_in_pallet: number;
  trans_margin_per_out_pallet: number;
  blended_margin_per_total_pallets: number;
};

export type ScenarioTotals = {
  total_revenue: number;
  total_cost: number;
  total_margin: number;
  overall_margin_pct: number;
};

export type ScenarioRunResponse = {
  scope_id: string;
  scope_label: string;
  per_type: Record<WorkType, ScenarioTypeResult>;
  totals: ScenarioTotals;
};
