import type { ScenarioInputs, WorkType } from "../types";

export const currentVolumes: Record<WorkType, ScenarioInputs> = {
  consolidation: { pallets_in: 35448, pallets_out: 49940 },
  groupage: { pallets_in: 48438, pallets_out: 51333 },
  stock: { pallets_in: 103585, pallets_out: 90453 }
};
