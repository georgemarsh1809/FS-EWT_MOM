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
  optimiseRunning: boolean;
  optimiseProgress: number;
  error: string | null;
  setScopeId: (scopeId: string) => void;
  setLockTotalIn: (value: boolean) => void;
  setLockTotalOut: (value: boolean) => void;
  updatePallets: (type: WorkType, field: "pallets_in" | "pallets_out", value: number) => void;
  resetInputs: () => void;
  optimiseInputs: () => Promise<void>;
  fetchRates: (scopeId: string) => Promise<void>;
  runScenario: () => Promise<void>;
};

const getDefaultInputs = (): Record<WorkType, ScenarioInputs> =>
  WORK_TYPES.reduce((acc, type) => {
    acc[type] = { ...currentVolumes[type] };
    return acc;
  }, {} as Record<WorkType, ScenarioInputs>);

const sumBy = (inputs: Record<WorkType, ScenarioInputs>, field: "pallets_in" | "pallets_out") =>
  WORK_TYPES.reduce((sum, type) => sum + inputs[type][field], 0);

const getStepSize = (totalIn: number, totalOut: number) => {
  const base = Math.max(totalIn, totalOut);
  if (base <= 1000) {
    return 50;
  }
  return Math.max(100, Math.round(base / 400));
};

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  scopeId: "p1_p9_avg",
  rates: null,
  inputs: getDefaultInputs(),
  lockTotalIn: true,
  lockTotalOut: true,
  results: null,
  loading: false,
  optimiseRunning: false,
  optimiseProgress: 0,
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
  resetInputs: () => set({ inputs: getDefaultInputs() }),
  optimiseInputs: async () => {
    const { rates, inputs } = get();
    if (!rates) {
      set({ error: "Load rates before running optimisation.", optimiseRunning: false, optimiseProgress: 0 });
      return;
    }

    set({ optimiseRunning: true, optimiseProgress: 0, error: null });
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    const totalIn = sumBy(inputs, "pallets_in");
    const totalOut = sumBy(inputs, "pallets_out");

    if (totalIn === 0 && totalOut === 0) {
      set({ error: "Totals are zero. Add volume before optimising.", optimiseRunning: false, optimiseProgress: 0 });
      return;
    }

    const minTotalOut = Math.ceil(totalIn * 0.9);
    const maxTotalOut = Math.floor(totalIn * 1.1);
    if (totalOut < minTotalOut || totalOut > maxTotalOut) {
      set({
        error:
          "No feasible solution: total OUT must be within ±10% of total IN to satisfy per-type constraints.",
        optimiseRunning: false,
        optimiseProgress: 0
      });
      return;
    }

    const step = getStepSize(totalIn, totalOut);
    const types = WORK_TYPES;
    const [typeA, typeB, typeC] = types;

    const currentDistance = (candidate: Record<WorkType, ScenarioInputs>) =>
      types.reduce((sum, type) => {
        const dIn = candidate[type].pallets_in - inputs[type].pallets_in;
        const dOut = candidate[type].pallets_out - inputs[type].pallets_out;
        return sum + dIn * dIn + dOut * dOut;
      }, 0);

    let best: { inputs: Record<WorkType, ScenarioInputs>; marginPct: number; distance: number } | null = null;
    let processedPairs = 0;
    const totalPairs =
      Math.floor(totalIn / step) + 1 > 0
        ? Array.from({ length: Math.floor(totalIn / step) + 1 }).reduce((sum, _, index) => {
            const inA = index * step;
            const remaining = totalIn - inA;
            return sum + (Math.floor(remaining / step) + 1);
          }, 0)
        : 0;
    let lastProgressTime = performance.now();
    let lastYieldTime = lastProgressTime;
    let rafPending = false;
    const updateProgress = (progress: number) => {
      if (rafPending) {
        return;
      }
      rafPending = true;
      window.requestAnimationFrame(() => {
        set({ optimiseProgress: Math.min(1, progress) });
        rafPending = false;
      });
    };

    for (let inA = 0; inA <= totalIn; inA += step) {
      for (let inB = 0; inB <= totalIn - inA; inB += step) {
        const inC = totalIn - inA - inB;

        const minOutA = Math.ceil(inA * 0.9);
        const maxOutA = Math.floor(inA * 1.1);
        const minOutB = Math.ceil(inB * 0.9);
        const maxOutB = Math.floor(inB * 1.1);
        const minOutC = Math.ceil(inC * 0.9);
        const maxOutC = Math.floor(inC * 1.1);

        const minOutSum = minOutA + minOutB + minOutC;
        const maxOutSum = maxOutA + maxOutB + maxOutC;
        if (totalOut < minOutSum || totalOut > maxOutSum) {
          continue;
        }

        for (let outA = minOutA; outA <= maxOutA; outA += step) {
          for (let outB = minOutB; outB <= maxOutB; outB += step) {
            const outC = totalOut - outA - outB;
            if (outC < minOutC || outC > maxOutC) {
              continue;
            }

            const candidate: Record<WorkType, ScenarioInputs> = {
              [typeA]: { pallets_in: inA, pallets_out: outA },
              [typeB]: { pallets_in: inB, pallets_out: outB },
              [typeC]: { pallets_in: inC, pallets_out: outC }
            };

            let totalRevenue = 0;
            let totalCost = 0;
            for (const type of types) {
              const rate = rates.types[type];
              const inValue = candidate[type].pallets_in;
              const outValue = candidate[type].pallets_out;
              totalRevenue += inValue * rate.wh_rev_per_in_pallet + outValue * rate.trans_rev_per_out_pallet;
              totalCost += inValue * rate.wh_cost_per_in_pallet + outValue * rate.trans_cost_per_out_pallet;
            }
            if (totalRevenue <= 0) {
              continue;
            }
            const marginPct = (totalRevenue - totalCost) / totalRevenue;
            const distance = currentDistance(candidate);

            if (!best || marginPct > best.marginPct + 1e-9) {
              best = { inputs: candidate, marginPct, distance };
            } else if (Math.abs(marginPct - best.marginPct) <= 1e-9 && distance < best.distance) {
              best = { inputs: candidate, marginPct, distance };
            }
          }
        }

        processedPairs += 1;
        if (processedPairs % 200 === 0) {
          const now = performance.now();
          if (now - lastProgressTime > 80) {
            const progress = totalPairs > 0 ? processedPairs / totalPairs : 0;
            updateProgress(progress);
            lastProgressTime = now;
          }
          if (now - lastYieldTime > 120) {
            lastYieldTime = now;
            await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
          }
        }
      }
    }

    if (!best) {
      set({
        error: "No feasible optimisation found with current totals and constraints.",
        optimiseRunning: false,
        optimiseProgress: 0
      });
      return;
    }

    set({ inputs: best.inputs, error: null, optimiseRunning: false, optimiseProgress: 1 });
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
