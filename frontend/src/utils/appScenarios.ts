// Scenarios feature for the Q1 App, working with the complex calculation model

type WorkTypeKey = 'consol' | 'groupage' | 'stock';
type FieldKey = string; // Reuse the FieldKey type from App

export type ScenarioMix = {
  name: string;
  consol: number; // percentage
  groupage: number; // percentage
  stock: number; // percentage
};

export type ScenarioComparison = {
  mix: ScenarioMix;
  consolPct: number;
  groupagePct: number;
  stockPct: number;
  totalMargin: number;
};

export const OTHER_SCENARIO_MIXES: ScenarioMix[] = [
  { name: "Equal split", consol: 33, groupage: 33, stock: 34 },
  { name: "Consolidation focus", consol: 40, groupage: 30, stock: 30 },
  { name: "Groupage focus", consol: 30, groupage: 40, stock: 30 },
  { name: "Stock focus", consol: 20, groupage: 20, stock: 60 },
  { name: "Light stock", consol: 40, groupage: 35, stock: 25 },
  { name: "Balanced groupage", consol: 25, groupage: 45, stock: 30 },
  { name: "High consolidation", consol: 50, groupage: 30, stock: 20 },
  { name: "Consol/groupage", consol: 45, groupage: 45, stock: 10 },
  { name: "Conservative stock", consol: 35, groupage: 35, stock: 30 },
];

/**
 * Given a volume mix percentage (pallets_out basis) and current total pallets_out,
 * calculate new pallet_out volumes for each work type
 */
function calculateNewPalletsOut(
  mix: ScenarioMix,
  currentPalletsOut: Record<WorkTypeKey, number>,
) {
  const types: WorkTypeKey[] = ['consol', 'groupage', 'stock'];

  // Calculate grand total of pallets out
  let grandTotalOut = 0;
  for (const type of types) {
    grandTotalOut += currentPalletsOut[type];
  }

  const newPalletsOut: Record<WorkTypeKey, number> = {} as Record<WorkTypeKey, number>;

  const percentages: Record<WorkTypeKey, number> = {
    consol: mix.consol,
    groupage: mix.groupage,
    stock: mix.stock,
  };

  for (const type of types) {
    newPalletsOut[type] = Math.round((grandTotalOut * percentages[type]) / 100);
  }

  return newPalletsOut;
}

/**
 * Generate scenario comparisons based on pallets_out distribution only
 * Uses the margin-per-pallet from current results to project margins under different volume distributions
 */
export function generateScenarioComparisons(
  currentPalletsOut: Record<WorkTypeKey, number>,
  marginPerPallet: Record<WorkTypeKey, number | null>,
): ScenarioComparison[] {
  const types: WorkTypeKey[] = ['consol', 'groupage', 'stock'];

  // Calculate actual current percentage distribution (pallets_out basis)
  let grandTotalOut = 0;
  for (const type of types) {
    grandTotalOut += currentPalletsOut[type];
  }

  const currentPcts = {
    consol: grandTotalOut > 0 ? Math.round((currentPalletsOut.consol / grandTotalOut) * 100) : 0,
    groupage: grandTotalOut > 0 ? Math.round((currentPalletsOut.groupage / grandTotalOut) * 100) : 0,
    stock: grandTotalOut > 0 ? Math.round((currentPalletsOut.stock / grandTotalOut) * 100) : 0,
  };

  // Build full list: baseline first, then other scenarios
  const allMixes: ScenarioMix[] = [
    { name: "Current baseline", consol: currentPcts.consol, groupage: currentPcts.groupage, stock: currentPcts.stock },
    ...OTHER_SCENARIO_MIXES,
  ];

  return allMixes.map((mix) => {
    const newPalletsOut = calculateNewPalletsOut(mix, currentPalletsOut);

    let totalMargin = 0;
    for (const type of types) {
      const marginRate = marginPerPallet[type];
      if (marginRate !== null && marginRate !== undefined) {
        totalMargin += newPalletsOut[type] * marginRate;
      }
    }

    return {
      mix,
      consolPct: mix.consol,
      groupagePct: mix.groupage,
      stockPct: mix.stock,
      totalMargin,
    };
  });
}
