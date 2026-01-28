import { create } from "zustand";

import { getRates, runScenario } from "../api/client";
import { currentVolumes } from "../defaults/currentVolumes";
import type { RatesResponse, ScenarioRunResponse, ScenarioInputs, WorkType } from "../types";

const WORK_TYPES: WorkType[] = ["consolidation", "groupage", "stock"];
const MAX_PALLETS = Number.MAX_SAFE_INTEGER;

const clampInt = (value: number, min = 0, max = MAX_PALLETS) => {
  const rounded = Math.round(Number.isFinite(value) ? value : 0);
  return Math.max(min, Math.min(max, rounded));
};

const rebalanceTotals = (
  values: Record<WorkType, number>,
  changed: WorkType,
  newValue: number,
  total: number
): Record<WorkType, number> => {
  const result = { ...values, [changed]: newValue };
  const otherTypes = WORK_TYPES.filter((type) => type !== changed);
  const remaining = Math.max(0, total - newValue);
  const sumOthers = otherTypes.reduce((sum, type) => sum + values[type], 0);

  if (remaining === 0) {
    result[otherTypes[0]] = 0;
    result[otherTypes[1]] = 0;
    return result;
  }

  if (sumOthers === 0) {
    const split = Math.floor(remaining / 2);
    result[otherTypes[0]] = split;
    result[otherTypes[1]] = remaining - split;
    return result;
  }

  const allocations = otherTypes.map((type) => {
    const raw = (values[type] / sumOthers) * remaining;
    const floored = Math.floor(raw);
    return { type, raw, floored, fraction: raw - floored };
  });

  let assigned = allocations.reduce((sum, item) => sum + item.floored, 0);
  let remainder = remaining - assigned;

  allocations.sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < allocations.length && remainder > 0; i += 1) {
    allocations[i].floored += 1;
    remainder -= 1;
  }

  allocations.forEach((item) => {
    result[item.type] = item.floored;
  });

  return result;
};

export type ScenarioState = {
  scopeId: string;
  rates: RatesResponse | null;
  inputs: Record<WorkType, ScenarioInputs>;
  lockTotalIn: boolean;
  lockTotalOut: boolean;
  results: ScenarioRunResponse | null;
  loading: boolean;
  error: string | null;
  setScopeId: (scopeId: string) => void;
  setLockTotalIn: (value: boolean) => void;
  setLockTotalOut: (value: boolean) => void;
  updatePallets: (type: WorkType, field: "pallets_in" | "pallets_out", value: number) => void;
  fetchRates: (scopeId: string) => Promise<void>;
  runScenario: () => Promise<void>;
};

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  scopeId: "p1_p9_avg",
  rates: null,
  inputs: currentVolumes,
  lockTotalIn: true,
  lockTotalOut: true,
  results: null,
  loading: false,
  error: null,
  setScopeId: (scopeId) => set({ scopeId }),
  setLockTotalIn: (value) => set({ lockTotalIn: value }),
  setLockTotalOut: (value) => set({ lockTotalOut: value }),
  updatePallets: (type, field, value) => {
    const { inputs, lockTotalIn, lockTotalOut } = get();
    const clamped = clampInt(value);
    let nextInputs = { ...inputs, [type]: { ...inputs[type], [field]: clamped } };

    if (field === "pallets_in" && lockTotalIn) {
      const totalIn = WORK_TYPES.reduce((sum, key) => sum + inputs[key].pallets_in, 0);
      const nextValue = Math.min(clamped, totalIn);
      const currentValues = WORK_TYPES.reduce<Record<WorkType, number>>((acc, key) => {
        acc[key] = inputs[key].pallets_in;
        return acc;
      }, {} as Record<WorkType, number>);
      const rebalanced = rebalanceTotals(currentValues, type, nextValue, totalIn);
      nextInputs = WORK_TYPES.reduce((acc, key) => {
        acc[key] = { ...inputs[key], pallets_in: rebalanced[key] };
        return acc;
      }, {} as Record<WorkType, ScenarioInputs>);
    }

    if (field === "pallets_out") {
      if (lockTotalOut) {
        const totalOut = WORK_TYPES.reduce((sum, key) => sum + inputs[key].pallets_out, 0);
        const nextValue = Math.min(clamped, totalOut);
        const currentValues = WORK_TYPES.reduce<Record<WorkType, number>>((acc, key) => {
          acc[key] = inputs[key].pallets_out;
          return acc;
        }, {} as Record<WorkType, number>);
        const rebalanced = rebalanceTotals(currentValues, type, nextValue, totalOut);
        nextInputs = WORK_TYPES.reduce((acc, key) => {
          acc[key] = { ...inputs[key], pallets_out: rebalanced[key] };
          return acc;
        }, {} as Record<WorkType, ScenarioInputs>);
      }
    }
    set({ inputs: nextInputs });
  },
  fetchRates: async (scopeId: string) => {
    set({ loading: true, error: null });
    try {
      const rates = await getRates(scopeId);
      set({ rates, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load rates";
      set({ error: message, loading: false });
    }
  },
  runScenario: async () => {
    const { scopeId, inputs } = get();
    if (!scopeId) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const results = await runScenario({ scope_id: scopeId, inputs });
      set({ results, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run scenario";
      set({ error: message, loading: false });
    }
  }
}));
