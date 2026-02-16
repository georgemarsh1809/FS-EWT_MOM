import type { ScenarioInputs, WorkType } from "../types";

export const currentVolumes: Record<WorkType, ScenarioInputs> = {
  consolidation: { pallets_in: 39034, pallets_out: 53721 },
  groupage: { pallets_in: 53337, pallets_out: 55219 },
  stock: { pallets_in: 114062, pallets_out: 97301 }
};
