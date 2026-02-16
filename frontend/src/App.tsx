import { useEffect, useMemo, useState } from 'react';
import './App.css';

type WorkTypeKey = 'consol' | 'groupage' | 'stock';

type FieldKey =
    | 'consol_trans_rev'
    | 'groupage_trans_rev'
    | 'stock_trans_rev'
    | 'consol_pallet_out'
    | 'groupage_pallet_out'
    | 'stock_pallet_out'
    | 'consol_df_in'
    | 'consol_pw_in'
    | 'groupage_df_in'
    | 'groupage_pw_in'
    | 'stock_in_total'
    | 'rhd_levy_rev'
    | 'secondary_storage_rev'
    | 'breakdown_restack_rev'
    | 'consol_direct_cost'
    | 'groupage_direct_cost'
    | 'stock_direct_cost'
    | 'stock_transfer_cost'
    | 'total_indirect_fs_ewt'
    | 'total_central_transport_cost'
    | 'ewt_indirect_cost'
    | 'df_rhd_direct_cost'
    | 'df_rhd_indirect_cost'
    | 'df_rhd_central_cost'
    | 'df_secondary_direct_cost'
    | 'df_secondary_indirect_cost'
    | 'df_secondary_central_cost'
    | 'df_breakdown_direct_cost'
    | 'df_breakdown_indirect_cost'
    | 'df_breakdown_central_cost'
    | 'pw_rhd_direct_cost'
    | 'pw_rhd_indirect_cost'
    | 'pw_rhd_central_cost'
    | 'pw_secondary_direct_cost'
    | 'pw_secondary_indirect_cost'
    | 'pw_secondary_central_cost'
    | 'pw_breakdown_direct_cost'
    | 'pw_breakdown_indirect_cost'
    | 'pw_breakdown_central_cost'
    | 'exp_rev'
    | 'exp_direct_cost'
    | 'exp_indirect_cost'
    | 'qc_rev'
    | 'qc_direct_cost'
    | 'qc_indirect_cost'
    | 'qc_central_cost';

type FieldDef = {
    key: FieldKey;
    label: string;
    hint?: string;
};

type Inputs = Record<FieldKey, string>;

type PerTypeResult = {
    palletsIn: number;
    palletsOut: number;
    whRevenue: number;
    transRevenue: number;
    whCost: number;
    transCost: number;
    totalRevenue: number;
    totalCost: number;
    totalMargin: number;
    whRevenuePerIn: number | null;
    transRevenuePerOut: number | null;
    whCostPerIn: number | null;
    transCostPerOut: number | null;
    marginPerPallet: number | null;
};

type Results = {
    perType: Record<WorkTypeKey, PerTypeResult>;
    totals: {
        totalRevenue: number;
        totalCost: number;
        totalMargin: number;
        overallMarginPct: number;
    };
};

const STORAGE_KEY = 'margin_model_q1_inputs_v1';
const WORK_TYPES: WorkTypeKey[] = ['consol', 'groupage', 'stock'];
const MONEY_FIELDS = new Set<FieldKey>([
    'consol_trans_rev',
    'groupage_trans_rev',
    'stock_trans_rev',
    'rhd_levy_rev',
    'secondary_storage_rev',
    'breakdown_restack_rev',
    'consol_direct_cost',
    'groupage_direct_cost',
    'stock_direct_cost',
    'stock_transfer_cost',
    'total_indirect_fs_ewt',
    'ewt_indirect_cost',
    'df_rhd_direct_cost',
    'df_rhd_indirect_cost',
    'df_rhd_central_cost',
    'df_secondary_direct_cost',
    'df_secondary_indirect_cost',
    'df_secondary_central_cost',
    'df_breakdown_direct_cost',
    'df_breakdown_indirect_cost',
    'df_breakdown_central_cost',
    'pw_rhd_direct_cost',
    'pw_rhd_indirect_cost',
    'pw_rhd_central_cost',
    'pw_secondary_direct_cost',
    'pw_secondary_indirect_cost',
    'pw_secondary_central_cost',
    'pw_breakdown_direct_cost',
    'pw_breakdown_indirect_cost',
    'pw_breakdown_central_cost',
    'exp_rev',
    'exp_direct_cost',
    'exp_indirect_cost',
    'qc_rev',
    'qc_direct_cost',
    'qc_indirect_cost',
    'qc_central_cost',
]);

type TransportRevenueSection = {
    perPallet: Record<WorkTypeKey, number | null>;
};

type WarehouseRevenueSection = {
    palletsIn: Record<WorkTypeKey, number>;
    proportions: Record<WorkTypeKey, number>;
    allocatedRevenue: Record<WorkTypeKey, number>;
    revenuePerPallet: Record<WorkTypeKey, number | null>;
};

type TransportCostSection = {
    indirectShares: Record<WorkTypeKey, number>;
    totalCost: Record<WorkTypeKey, number>;
    costPerPallet: Record<WorkTypeKey, number | null>;
};

type WarehouseCostSection = {
    streamTotals: {
        rhd: number;
        secondary: number;
        breakdown: number;
    };
    allocatedCost: Record<WorkTypeKey, number>;
    costPerPallet: Record<WorkTypeKey, number | null>;
};

type SectionOutputs = {
    'transport-revenue'?: TransportRevenueSection;
    'wh-revenue'?: WarehouseRevenueSection;
    'transport-cost'?: TransportCostSection;
    'wh-costs'?: WarehouseCostSection;
};

type Q2StreamId =
    | 'exp'
    | 'dis_consol'
    | 'dis_groupage'
    | 'dis_stock'
    | 'wh_rhd'
    | 'wh_storage'
    | 'wh_breakdown'
    | 'qc';

type Q2StreamSource = 'Q1 derived' | 'Q2 input';

type Q2StreamRow = {
    id: Q2StreamId;
    label: string;
    revenue: number;
    directCost: number;
    indirectCost: number;
    centralCost: number;
    totalCost: number;
    marginValue: number;
    marginPct: number | null;
    source: Q2StreamSource;
};

type Q2Results = {
    rows: Q2StreamRow[];
    winnerByMarginPct: Q2StreamRow | null;
    totals: {
        revenue: number;
        totalCost: number;
        marginValue: number;
        marginPct: number | null;
    };
};

type Q3Row = Q2StreamRow & {
    costSharePct: number | null;
    revenueSharePct: number | null;
    costRevShareRatio: number | null;
    isTop3Flagged: boolean;
};

type Q3Results = {
    rowsSortedByCost: Q3Row[];
    top3ByRatio: Q3Row[];
    totals: {
        revenue: number;
        totalCost: number;
    };
};

const FIELD_DEFS: FieldDef[] = [
    { key: 'consol_trans_rev', label: 'Revenue' },
    { key: 'groupage_trans_rev', label: 'Revenue' },
    { key: 'stock_trans_rev', label: 'Revenue' },
    { key: 'consol_pallet_out', label: 'Pallets Out' },
    { key: 'groupage_pallet_out', label: 'Pallets Out' },
    { key: 'stock_pallet_out', label: 'Pallets Out' },
    { key: 'consol_df_in', label: 'DF Pallets In' },
    { key: 'consol_pw_in', label: 'PW Pallets In' },
    { key: 'groupage_df_in', label: 'DF Pallets In' },
    { key: 'groupage_pw_in', label: 'PW Pallets In' },
    { key: 'stock_in_total', label: 'Pallets In (All Sites)' },
    { key: 'rhd_levy_rev', label: 'RH&D/Levy' },
    { key: 'secondary_storage_rev', label: 'Secondary Storage/Levy' },
    { key: 'breakdown_restack_rev', label: 'Breakdown/Restack' },
    { key: 'consol_direct_cost', label: 'Direct Cost' },
    { key: 'groupage_direct_cost', label: 'Direct Cost' },
    { key: 'stock_direct_cost', label: 'Direct Cost' },
    { key: 'stock_transfer_cost', label: 'Transfer Cost' },
    { key: 'total_indirect_fs_ewt', label: 'Total Indirect Costs (FS + EWT)' },
    { key: 'total_central_transport_cost', label: 'Total Central Costs' },
    { key: 'ewt_indirect_cost', label: 'EWT Indirect Costs' },
    { key: 'df_rhd_direct_cost', label: 'Direct Costs' },
    { key: 'df_rhd_indirect_cost', label: 'Indirect Costs' },
    { key: 'df_rhd_central_cost', label: 'Central Costs' },
    { key: 'df_secondary_direct_cost', label: 'Direct Costs' },
    { key: 'df_secondary_indirect_cost', label: 'Indirect Costs' },
    { key: 'df_secondary_central_cost', label: 'Central Costs' },
    { key: 'df_breakdown_direct_cost', label: 'Direct Costs' },
    { key: 'df_breakdown_indirect_cost', label: 'Indirect Costs' },
    { key: 'df_breakdown_central_cost', label: 'Central Costs' },
    { key: 'pw_rhd_direct_cost', label: 'Direct Costs' },
    { key: 'pw_rhd_indirect_cost', label: 'Indirect Costs' },
    { key: 'pw_rhd_central_cost', label: 'Central Costs' },
    { key: 'pw_secondary_direct_cost', label: 'Direct Costs' },
    { key: 'pw_secondary_indirect_cost', label: 'Indirect Costs' },
    { key: 'pw_secondary_central_cost', label: 'Central Costs' },
    { key: 'pw_breakdown_direct_cost', label: 'Direct Costs' },
    { key: 'pw_breakdown_indirect_cost', label: 'Indirect Costs' },
    { key: 'pw_breakdown_central_cost', label: 'Central Costs' },
    { key: 'exp_rev', label: 'EXP Revenue (YTD)' },
    { key: 'exp_direct_cost', label: 'EXP Direct Cost (YTD)' },
    { key: 'exp_indirect_cost', label: 'EXP Indirect Cost (YTD)' },
    { key: 'qc_rev', label: 'QC Revenue (YTD)' },
    { key: 'qc_direct_cost', label: 'QC Direct Cost (YTD)' },
    { key: 'qc_indirect_cost', label: 'QC Indirect Cost (YTD)' },
    { key: 'qc_central_cost', label: 'QC Central Cost (YTD)' },
];

const SECTION_DEFS: Array<{
    id: string;
    title: string;
    summary: string;
    fields: FieldKey[];
}> = [
    {
        id: 'transport-revenue',
        title: '1. Transport revenue (Job Report)',
        summary:
            'Totals and pallet volumes out, used to derive transport revenue per pallet.',
        fields: [
            'consol_trans_rev',
            'groupage_trans_rev',
            'stock_trans_rev',
            'consol_pallet_out',
            'groupage_pallet_out',
            'stock_pallet_out',
        ],
    },
    {
        id: 'wh-revenue',
        title: '2. Warehouse revenue (MA)',
        summary:
            'Pallets in by site plus revenue streams. Consol has no warehouse revenue.',
        fields: [
            'consol_df_in',
            'consol_pw_in',
            'groupage_df_in',
            'groupage_pw_in',
            'stock_in_total',
            'rhd_levy_rev',
            'secondary_storage_rev',
            'breakdown_restack_rev',
        ],
    },
    {
        id: 'transport-cost',
        title: '3. Transport cost (Job Report + MA)',
        summary:
            'Direct costs plus indirect allocation based on pallet volumes out.',
        fields: [
            'consol_direct_cost',
            'groupage_direct_cost',
            'stock_direct_cost',
            'stock_transfer_cost',
            'total_indirect_fs_ewt',
            'total_central_transport_cost',
            'ewt_indirect_cost',
            'consol_pallet_out',
            'groupage_pallet_out',
            'stock_pallet_out',
        ],
    },
    {
        id: 'wh-costs',
        title: '4. Warehouse cost (MA)',
        summary:
            'Costs by site and stream. RH&D allocated by pallet share; secondary and breakdown go 100% to stock.',
        fields: [
            'consol_df_in',
            'consol_pw_in',
            'groupage_df_in',
            'groupage_pw_in',
            'stock_in_total',
            'df_rhd_direct_cost',
            'df_rhd_indirect_cost',
            'df_rhd_central_cost',
            'df_secondary_direct_cost',
            'df_secondary_indirect_cost',
            'df_secondary_central_cost',
            'df_breakdown_direct_cost',
            'df_breakdown_indirect_cost',
            'df_breakdown_central_cost',
            'pw_rhd_direct_cost',
            'pw_rhd_indirect_cost',
            'pw_rhd_central_cost',
            'pw_secondary_direct_cost',
            'pw_secondary_indirect_cost',
            'pw_secondary_central_cost',
            'pw_breakdown_direct_cost',
            'pw_breakdown_indirect_cost',
            'pw_breakdown_central_cost',
        ],
    },
];

const EMPTY_INPUTS: Inputs = FIELD_DEFS.reduce((acc, field) => {
    acc[field.key] = '';
    return acc;
}, {} as Inputs);

const normaliseInputs = (parsed: Partial<Inputs> | null | undefined): Inputs => ({
    ...EMPTY_INPUTS,
    ...(parsed ?? {}),
});

const SEEDED_DEFAULT_INPUTS: Inputs = normaliseInputs({
    consol_trans_rev: '1567258.69',
    groupage_trans_rev: '1358788.61',
    stock_trans_rev: '5159006.42',
    consol_pallet_out: '25656.7',
    groupage_pallet_out: '26555.4',
    stock_pallet_out: '96094.4',
    consol_df_in: '32429',
    consol_pw_in: '6850',
    groupage_df_in: '52546',
    groupage_pw_in: '2382',
    stock_in_total: '105246.6',
    rhd_levy_rev: '1543947.00',
    secondary_storage_rev: '728841.00',
    breakdown_restack_rev: '328784.00',
    consol_direct_cost: '1084673.09',
    groupage_direct_cost: '894707.20',
    stock_direct_cost: '2785885.01',
    stock_transfer_cost: '294569.65',
    total_indirect_fs_ewt: '905482.14',
    total_central_transport_cost: '432853',
    ewt_indirect_cost: '687001',
    df_rhd_direct_cost: '644259',
    df_rhd_indirect_cost: '175299',
    df_rhd_central_cost: '385737',
    df_secondary_direct_cost: '82787',
    df_secondary_indirect_cost: '421661',
    df_secondary_central_cost: '82658',
    df_breakdown_direct_cost: '235051',
    df_breakdown_indirect_cost: '137395',
    df_breakdown_central_cost: '82658',
    pw_rhd_direct_cost: '526388',
    pw_rhd_indirect_cost: '253502',
    pw_rhd_central_cost: '196357',
    pw_secondary_direct_cost: '62784',
    pw_secondary_indirect_cost: '562439',
    pw_secondary_central_cost: '42076',
    pw_breakdown_direct_cost: '64297',
    pw_breakdown_indirect_cost: '181478',
    pw_breakdown_central_cost: '42076',
    exp_rev: '1441512',
    exp_direct_cost: '1193727',
    exp_indirect_cost: '168575',
    qc_rev: '163390',
    qc_direct_cost: '115400',
    qc_indirect_cost: '40644',
    qc_central_cost: '37658',
});

const Q1_REQUIRED_FIELDS: FieldKey[] = Array.from(
    new Set(SECTION_DEFS.flatMap((section) => section.fields)),
);

const Q2_ONLY_FIELDS: FieldKey[] = [
    'exp_rev',
    'exp_direct_cost',
    'exp_indirect_cost',
    'qc_rev',
    'qc_direct_cost',
    'qc_indirect_cost',
    'qc_central_cost',
];

const Q2_REQUIRED_Q1_FIELDS: FieldKey[] = [
    'consol_trans_rev',
    'groupage_trans_rev',
    'stock_trans_rev',
    'consol_pallet_out',
    'groupage_pallet_out',
    'stock_pallet_out',
    'consol_direct_cost',
    'groupage_direct_cost',
    'stock_direct_cost',
    'stock_transfer_cost',
    'total_indirect_fs_ewt',
    'ewt_indirect_cost',
    'total_central_transport_cost',
    'rhd_levy_rev',
    'secondary_storage_rev',
    'breakdown_restack_rev',
    'df_rhd_direct_cost',
    'df_rhd_indirect_cost',
    'df_rhd_central_cost',
    'pw_rhd_direct_cost',
    'pw_rhd_indirect_cost',
    'pw_rhd_central_cost',
    'df_secondary_direct_cost',
    'df_secondary_indirect_cost',
    'df_secondary_central_cost',
    'pw_secondary_direct_cost',
    'pw_secondary_indirect_cost',
    'pw_secondary_central_cost',
    'df_breakdown_direct_cost',
    'df_breakdown_indirect_cost',
    'df_breakdown_central_cost',
    'pw_breakdown_direct_cost',
    'pw_breakdown_indirect_cost',
    'pw_breakdown_central_cost',
];

const tabs = Array.from({ length: 9 }).map((_, index) => ({
    id: `q${index + 1}`,
    label: `Question ${index + 1}`,
}));

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        maximumFractionDigits: 2,
    }).format(value);

const formatPercent = (value: number) =>
    new Intl.NumberFormat('en-GB', {
        style: 'percent',
        maximumFractionDigits: 1,
    }).format(value);

const formatNumber = (value: number) =>
    new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(value);

const titleCase = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1);

const getFieldDef = (key: FieldKey) =>
    FIELD_DEFS.find((field) => field.key === key);
const isMoneyField = (key: FieldKey) => MONEY_FIELDS.has(key);

const parseInputs = (inputs: Inputs) => {
    const parsed: Partial<Record<FieldKey, number | null>> = {};
    FIELD_DEFS.forEach((field) => {
        const raw = inputs[field.key];
        if (raw === '' || raw === null || raw === undefined) {
            parsed[field.key] = null;
            return;
        }
        const value = Number(raw);
        parsed[field.key] = Number.isFinite(value) ? value : null;
    });
    return parsed as Record<FieldKey, number | null>;
};

const getSectionMissing = (
    sectionFields: FieldKey[],
    parsed: Record<FieldKey, number | null>,
) => sectionFields.filter((key) => parsed[key] === null);

const computeTransportRevenueSection = (
    v: Record<FieldKey, number>,
): TransportRevenueSection => {
    const palletsOut = {
        consol: v.consol_pallet_out,
        groupage: v.groupage_pallet_out,
        stock: v.stock_pallet_out,
    };
    const perPallet = {
        consol:
            palletsOut.consol > 0
                ? v.consol_trans_rev / palletsOut.consol
                : null,
        groupage:
            palletsOut.groupage > 0
                ? v.groupage_trans_rev / palletsOut.groupage
                : null,
        stock:
            palletsOut.stock > 0 ? v.stock_trans_rev / palletsOut.stock : null,
    };
    return { perPallet };
};

const computeWarehouseRevenueSection = (
    v: Record<FieldKey, number>,
): WarehouseRevenueSection => {
    const palletsIn = {
        consol: v.consol_df_in + v.consol_pw_in,
        groupage: v.groupage_df_in + v.groupage_pw_in,
        stock: v.stock_in_total,
    };
    const totalPallets =
        palletsIn.consol + palletsIn.groupage + palletsIn.stock;
    const proportions = {
        consol: totalPallets > 0 ? palletsIn.consol / totalPallets : 0,
        groupage: totalPallets > 0 ? palletsIn.groupage / totalPallets : 0,
        stock: totalPallets > 0 ? palletsIn.stock / totalPallets : 0,
    };

    const groupageStockPallets = palletsIn.groupage + palletsIn.stock;
    const groupageShareForRhd =
        groupageStockPallets > 0
            ? palletsIn.groupage / groupageStockPallets
            : 0;
    const stockShareForRhd =
        groupageStockPallets > 0 ? palletsIn.stock / groupageStockPallets : 0;

    const allocatedRevenue = {
        consol: 0,
        groupage: v.rhd_levy_rev * groupageShareForRhd,
        stock:
            v.rhd_levy_rev * stockShareForRhd +
            v.secondary_storage_rev +
            v.breakdown_restack_rev,
    };

    const revenuePerPallet = {
        consol:
            palletsIn.consol > 0
                ? allocatedRevenue.consol / palletsIn.consol
                : null,
        groupage:
            palletsIn.groupage > 0
                ? allocatedRevenue.groupage / palletsIn.groupage
                : null,
        stock:
            palletsIn.stock > 0
                ? allocatedRevenue.stock / palletsIn.stock
                : null,
    };

    return { palletsIn, proportions, allocatedRevenue, revenuePerPallet };
};

const computeTransportCostSection = (
    v: Record<FieldKey, number>,
): TransportCostSection => {
    const palletsOut = {
        consol: v.consol_pallet_out,
        groupage: v.groupage_pallet_out,
        stock: v.stock_pallet_out,
    };
    const totalPalletsOut =
        palletsOut.consol + palletsOut.groupage + palletsOut.stock;
    const fsIndirectTransport = v.total_indirect_fs_ewt - v.ewt_indirect_cost;
    const centralTransport = v.total_central_transport_cost;
    const indirectShares = {
        consol:
            totalPalletsOut > 0
                ? (palletsOut.consol / totalPalletsOut) * fsIndirectTransport
                : 0,
        groupage:
            totalPalletsOut > 0
                ? (palletsOut.groupage / totalPalletsOut) * fsIndirectTransport
                : 0,
        stock:
            totalPalletsOut > 0
                ? (palletsOut.stock / totalPalletsOut) * fsIndirectTransport
                : 0,
    };
    const centralShares = {
        consol:
            totalPalletsOut > 0
                ? (palletsOut.consol / totalPalletsOut) * centralTransport
                : 0,
        groupage:
            totalPalletsOut > 0
                ? (palletsOut.groupage / totalPalletsOut) * centralTransport
                : 0,
        stock:
            totalPalletsOut > 0
                ? (palletsOut.stock / totalPalletsOut) * centralTransport
                : 0,
    };
    const totalCost = {
        consol:
            v.consol_direct_cost + indirectShares.consol + centralShares.consol,
        groupage:
            v.groupage_direct_cost +
            indirectShares.groupage +
            centralShares.groupage,
        stock:
            v.stock_direct_cost +
            v.stock_transfer_cost +
            indirectShares.stock +
            centralShares.stock,
    };
    const costPerPallet = {
        consol:
            palletsOut.consol > 0 ? totalCost.consol / palletsOut.consol : null,
        groupage:
            palletsOut.groupage > 0
                ? totalCost.groupage / palletsOut.groupage
                : null,
        stock: palletsOut.stock > 0 ? totalCost.stock / palletsOut.stock : null,
    };
    return { indirectShares, totalCost, costPerPallet };
};

const computeWarehouseCostSection = (
    v: Record<FieldKey, number>,
): WarehouseCostSection => {
    const palletsIn = {
        consol: v.consol_df_in + v.consol_pw_in,
        groupage: v.groupage_df_in + v.groupage_pw_in,
        stock: v.stock_in_total,
    };
    const totalPallets =
        palletsIn.consol + palletsIn.groupage + palletsIn.stock;

    const rhd =
        v.df_rhd_direct_cost +
        v.df_rhd_indirect_cost +
        v.df_rhd_central_cost +
        v.pw_rhd_direct_cost +
        v.pw_rhd_indirect_cost +
        v.pw_rhd_central_cost;
    const secondary =
        v.df_secondary_direct_cost +
        v.df_secondary_indirect_cost +
        v.df_secondary_central_cost +
        v.pw_secondary_direct_cost +
        v.pw_secondary_indirect_cost +
        v.pw_secondary_central_cost;
    const breakdown =
        v.df_breakdown_direct_cost +
        v.df_breakdown_indirect_cost +
        v.df_breakdown_central_cost +
        v.pw_breakdown_direct_cost +
        v.pw_breakdown_indirect_cost +
        v.pw_breakdown_central_cost;

    const rhdAlloc = {
        consol: totalPallets > 0 ? (palletsIn.consol / totalPallets) * rhd : 0,
        groupage:
            totalPallets > 0 ? (palletsIn.groupage / totalPallets) * rhd : 0,
        stock: totalPallets > 0 ? (palletsIn.stock / totalPallets) * rhd : 0,
    };

    const allocatedCost = {
        consol: rhdAlloc.consol,
        groupage: rhdAlloc.groupage,
        stock: rhdAlloc.stock + secondary + breakdown,
    };

    const costPerPallet = {
        consol:
            palletsIn.consol > 0
                ? allocatedCost.consol / palletsIn.consol
                : null,
        groupage:
            palletsIn.groupage > 0
                ? allocatedCost.groupage / palletsIn.groupage
                : null,
        stock:
            palletsIn.stock > 0 ? allocatedCost.stock / palletsIn.stock : null,
    };

    return {
        streamTotals: { rhd, secondary, breakdown },
        allocatedCost,
        costPerPallet,
    };
};

const computeResults = (
    values: Record<FieldKey, number | null>,
): Results | null => {
    const missing = Q1_REQUIRED_FIELDS.some((key) => values[key] === null);
    if (missing) {
        return null;
    }

    const v = values as Record<FieldKey, number>;

    const palletsOut = {
        consol: v.consol_pallet_out,
        groupage: v.groupage_pallet_out,
        stock: v.stock_pallet_out,
    };

    const palletsIn = {
        consol: v.consol_df_in + v.consol_pw_in,
        groupage: v.groupage_df_in + v.groupage_pw_in,
        stock: v.stock_in_total,
    };

    const totalPalletsIn =
        palletsIn.consol + palletsIn.groupage + palletsIn.stock;
    const totalPalletsOut =
        palletsOut.consol + palletsOut.groupage + palletsOut.stock;

    const transRevenue = {
        consol: v.consol_trans_rev,
        groupage: v.groupage_trans_rev,
        stock: v.stock_trans_rev,
    };

    const transRevenuePerOut = {
        consol:
            palletsOut.consol > 0
                ? transRevenue.consol / palletsOut.consol
                : null,
        groupage:
            palletsOut.groupage > 0
                ? transRevenue.groupage / palletsOut.groupage
                : null,
        stock:
            palletsOut.stock > 0 ? transRevenue.stock / palletsOut.stock : null,
    };

    const whRevenueTotal = {
        rhd: v.rhd_levy_rev,
        secondary: v.secondary_storage_rev,
        breakdown: v.breakdown_restack_rev,
    };

    const groupageStockPallets = palletsIn.groupage + palletsIn.stock;
    const groupageShareForRhd =
        groupageStockPallets > 0
            ? palletsIn.groupage / groupageStockPallets
            : 0;
    const stockShareForRhd =
        groupageStockPallets > 0 ? palletsIn.stock / groupageStockPallets : 0;

    const whRevenue = {
        consol: 0,
        groupage: whRevenueTotal.rhd * groupageShareForRhd,
        stock:
            whRevenueTotal.rhd * stockShareForRhd +
            whRevenueTotal.secondary +
            whRevenueTotal.breakdown,
    };

    const whRevenuePerIn = {
        consol:
            palletsIn.consol > 0 ? whRevenue.consol / palletsIn.consol : null,
        groupage:
            palletsIn.groupage > 0
                ? whRevenue.groupage / palletsIn.groupage
                : null,
        stock: palletsIn.stock > 0 ? whRevenue.stock / palletsIn.stock : null,
    };

    const fsIndirectTransport = v.total_indirect_fs_ewt - v.ewt_indirect_cost;
    const centralTransport = v.total_central_transport_cost;
    const indirectShares = {
        consol:
            totalPalletsOut > 0
                ? (palletsOut.consol / totalPalletsOut) * fsIndirectTransport
                : 0,
        groupage:
            totalPalletsOut > 0
                ? (palletsOut.groupage / totalPalletsOut) * fsIndirectTransport
                : 0,
        stock:
            totalPalletsOut > 0
                ? (palletsOut.stock / totalPalletsOut) * fsIndirectTransport
                : 0,
    };
    const centralShares = {
        consol:
            totalPalletsOut > 0
                ? (palletsOut.consol / totalPalletsOut) * centralTransport
                : 0,
        groupage:
            totalPalletsOut > 0
                ? (palletsOut.groupage / totalPalletsOut) * centralTransport
                : 0,
        stock:
            totalPalletsOut > 0
                ? (palletsOut.stock / totalPalletsOut) * centralTransport
                : 0,
    };

    const transCost = {
        consol:
            v.consol_direct_cost + indirectShares.consol + centralShares.consol,
        groupage:
            v.groupage_direct_cost +
            indirectShares.groupage +
            centralShares.groupage,
        stock:
            v.stock_direct_cost +
            v.stock_transfer_cost +
            indirectShares.stock +
            centralShares.stock,
    };

    const transCostPerOut = {
        consol:
            palletsOut.consol > 0 ? transCost.consol / palletsOut.consol : null,
        groupage:
            palletsOut.groupage > 0
                ? transCost.groupage / palletsOut.groupage
                : null,
        stock: palletsOut.stock > 0 ? transCost.stock / palletsOut.stock : null,
    };

    const rhdTotal =
        v.df_rhd_direct_cost +
        v.df_rhd_indirect_cost +
        v.df_rhd_central_cost +
        v.pw_rhd_direct_cost +
        v.pw_rhd_indirect_cost +
        v.pw_rhd_central_cost;

    const secondaryTotal =
        v.df_secondary_direct_cost +
        v.df_secondary_indirect_cost +
        v.df_secondary_central_cost +
        v.pw_secondary_direct_cost +
        v.pw_secondary_indirect_cost +
        v.pw_secondary_central_cost;

    const breakdownTotal =
        v.df_breakdown_direct_cost +
        v.df_breakdown_indirect_cost +
        v.df_breakdown_central_cost +
        v.pw_breakdown_direct_cost +
        v.pw_breakdown_indirect_cost +
        v.pw_breakdown_central_cost;

    const rhdAlloc = {
        consol:
            totalPalletsIn > 0
                ? (palletsIn.consol / totalPalletsIn) * rhdTotal
                : 0,
        groupage:
            totalPalletsIn > 0
                ? (palletsIn.groupage / totalPalletsIn) * rhdTotal
                : 0,
        stock:
            totalPalletsIn > 0
                ? (palletsIn.stock / totalPalletsIn) * rhdTotal
                : 0,
    };

    const whCost = {
        consol: rhdAlloc.consol,
        groupage: rhdAlloc.groupage,
        stock: rhdAlloc.stock + secondaryTotal + breakdownTotal,
    };

    const whCostPerIn = {
        consol: palletsIn.consol > 0 ? whCost.consol / palletsIn.consol : null,
        groupage:
            palletsIn.groupage > 0
                ? whCost.groupage / palletsIn.groupage
                : null,
        stock: palletsIn.stock > 0 ? whCost.stock / palletsIn.stock : null,
    };

    const perType = (
        'consol groupage stock'.split(' ') as WorkTypeKey[]
    ).reduce(
        (acc, type) => {
            const totalRevenue = whRevenue[type] + transRevenue[type];
            const totalCost = whCost[type] + transCost[type];
            const margin = totalRevenue - totalCost;
            const denom = palletsIn[type] + palletsOut[type];
            acc[type] = {
                palletsIn: palletsIn[type],
                palletsOut: palletsOut[type],
                whRevenue: whRevenue[type],
                transRevenue: transRevenue[type],
                whCost: whCost[type],
                transCost: transCost[type],
                totalRevenue,
                totalCost,
                totalMargin: margin,
                whRevenuePerIn: whRevenuePerIn[type],
                transRevenuePerOut: transRevenuePerOut[type],
                whCostPerIn: whCostPerIn[type],
                transCostPerOut: transCostPerOut[type],
                marginPerPallet: denom > 0 ? margin / denom : null,
            };
            return acc;
        },
        {} as Record<WorkTypeKey, PerTypeResult>,
    );

    const totalRevenue =
        transRevenue.consol +
        transRevenue.groupage +
        transRevenue.stock +
        whRevenue.consol +
        whRevenue.groupage +
        whRevenue.stock;
    const totalCost =
        transCost.consol +
        transCost.groupage +
        transCost.stock +
        whCost.consol +
        whCost.groupage +
        whCost.stock;
    const totalMargin = totalRevenue - totalCost;
    const overallMarginPct = totalRevenue > 0 ? totalMargin / totalRevenue : 0;

    return {
        perType,
        totals: {
            totalRevenue,
            totalCost,
            totalMargin,
            overallMarginPct,
        },
    };
};

const buildQ2StreamRow = (
    id: Q2StreamId,
    label: string,
    revenue: number,
    directCost: number,
    indirectCost: number,
    centralCost: number,
    source: Q2StreamSource,
): Q2StreamRow => {
    const totalCost = directCost + indirectCost + centralCost;
    const marginValue = revenue - totalCost;
    const marginPct = revenue > 0 ? marginValue / revenue : null;
    return {
        id,
        label,
        revenue,
        directCost,
        indirectCost,
        centralCost,
        totalCost,
        marginValue,
        marginPct,
        source,
    };
};

const computeQ2DerivedRowsFromQ1 = (
    values: Record<FieldKey, number>,
): Q2StreamRow[] => {
    const palletsOut = {
        consol: values.consol_pallet_out,
        groupage: values.groupage_pallet_out,
        stock: values.stock_pallet_out,
    };
    const totalPalletsOut =
        palletsOut.consol + palletsOut.groupage + palletsOut.stock;
    const fsIndirectTransport =
        values.total_indirect_fs_ewt - values.ewt_indirect_cost;
    const centralTransport = values.total_central_transport_cost;

    const indirectShares = {
        consol:
            totalPalletsOut > 0
                ? (palletsOut.consol / totalPalletsOut) * fsIndirectTransport
                : 0,
        groupage:
            totalPalletsOut > 0
                ? (palletsOut.groupage / totalPalletsOut) * fsIndirectTransport
                : 0,
        stock:
            totalPalletsOut > 0
                ? (palletsOut.stock / totalPalletsOut) * fsIndirectTransport
                : 0,
    };
    const centralShares = {
        consol:
            totalPalletsOut > 0
                ? (palletsOut.consol / totalPalletsOut) * centralTransport
                : 0,
        groupage:
            totalPalletsOut > 0
                ? (palletsOut.groupage / totalPalletsOut) * centralTransport
                : 0,
        stock:
            totalPalletsOut > 0
                ? (palletsOut.stock / totalPalletsOut) * centralTransport
                : 0,
    };

    const whRhdDirect = values.df_rhd_direct_cost + values.pw_rhd_direct_cost;
    const whRhdIndirect =
        values.df_rhd_indirect_cost + values.pw_rhd_indirect_cost;
    const whRhdCentral =
        values.df_rhd_central_cost + values.pw_rhd_central_cost;

    const whStorageDirect =
        values.df_secondary_direct_cost + values.pw_secondary_direct_cost;
    const whStorageIndirect =
        values.df_secondary_indirect_cost + values.pw_secondary_indirect_cost;
    const whStorageCentral =
        values.df_secondary_central_cost + values.pw_secondary_central_cost;

    const whBreakdownDirect =
        values.df_breakdown_direct_cost + values.pw_breakdown_direct_cost;
    const whBreakdownIndirect =
        values.df_breakdown_indirect_cost + values.pw_breakdown_indirect_cost;
    const whBreakdownCentral =
        values.df_breakdown_central_cost + values.pw_breakdown_central_cost;

    return [
        buildQ2StreamRow(
            'dis_consol',
            'Transport (DIS) - Consol (Interim: to validate)',
            values.consol_trans_rev,
            values.consol_direct_cost,
            indirectShares.consol,
            centralShares.consol,
            'Q1 derived',
        ),
        buildQ2StreamRow(
            'dis_groupage',
            'Transport (DIS) - Groupage (Interim: to validate)',
            values.groupage_trans_rev,
            values.groupage_direct_cost,
            indirectShares.groupage,
            centralShares.groupage,
            'Q1 derived',
        ),
        buildQ2StreamRow(
            'dis_stock',
            'Transport (DIS) - Stock (Interim: to validate)',
            values.stock_trans_rev,
            values.stock_direct_cost + values.stock_transfer_cost,
            indirectShares.stock,
            centralShares.stock,
            'Q1 derived',
        ),
        buildQ2StreamRow(
            'wh_rhd',
            'WH RH&D / X-Dock',
            values.rhd_levy_rev,
            whRhdDirect,
            whRhdIndirect,
            whRhdCentral,
            'Q1 derived',
        ),
        buildQ2StreamRow(
            'wh_storage',
            'WH Storage',
            values.secondary_storage_rev,
            whStorageDirect,
            whStorageIndirect,
            whStorageCentral,
            'Q1 derived',
        ),
        buildQ2StreamRow(
            'wh_breakdown',
            'WH Breakdown / Restack',
            values.breakdown_restack_rev,
            whBreakdownDirect,
            whBreakdownIndirect,
            whBreakdownCentral,
            'Q1 derived',
        ),
    ];
};

const computeQ2Results = (values: Record<FieldKey, number>): Q2Results => {
    const rows: Q2StreamRow[] = [
        buildQ2StreamRow(
            'exp',
            'Express (EXP)',
            values.exp_rev,
            values.exp_direct_cost,
            values.exp_indirect_cost,
            0,
            'Q2 input',
        ),
        ...computeQ2DerivedRowsFromQ1(values),
        buildQ2StreamRow(
            'qc',
            'QC (Surveys)',
            values.qc_rev,
            values.qc_direct_cost,
            values.qc_indirect_cost,
            values.qc_central_cost,
            'Q2 input',
        ),
    ];

    const winnerByMarginPct = rows
        .filter((row) => row.marginPct !== null)
        .reduce<Q2StreamRow | null>((best, row) => {
            if (!best) {
                return row;
            }
            const bestPct = best.marginPct ?? Number.NEGATIVE_INFINITY;
            const rowPct = row.marginPct ?? Number.NEGATIVE_INFINITY;
            if (rowPct > bestPct + 1e-9) {
                return row;
            }
            if (Math.abs(rowPct - bestPct) <= 1e-9) {
                if (row.marginValue > best.marginValue + 1e-9) {
                    return row;
                }
                if (Math.abs(row.marginValue - best.marginValue) <= 1e-9) {
                    return row.label.localeCompare(best.label) < 0 ? row : best;
                }
            }
            return best;
        }, null);

    const totals = rows.reduce(
        (acc, row) => {
            acc.revenue += row.revenue;
            acc.totalCost += row.totalCost;
            acc.marginValue += row.marginValue;
            return acc;
        },
        { revenue: 0, totalCost: 0, marginValue: 0 },
    );

    return {
        rows,
        winnerByMarginPct,
        totals: {
            ...totals,
            marginPct: totals.revenue > 0 ? totals.marginValue / totals.revenue : null,
        },
    };
};

const computeQ3ResultsFromQ2 = (q2Results: Q2Results): Q3Results => {
    const totalCost = q2Results.rows.reduce((sum, row) => sum + row.totalCost, 0);
    const totalRevenue = q2Results.rows.reduce((sum, row) => sum + row.revenue, 0);

    const enrichedRows: Q3Row[] = q2Results.rows.map((row) => {
        const costSharePct = totalCost > 0 ? row.totalCost / totalCost : null;
        const revenueSharePct = totalRevenue > 0 ? row.revenue / totalRevenue : null;
        const costRevShareRatio =
            revenueSharePct !== null &&
            revenueSharePct > 0 &&
            costSharePct !== null
                ? costSharePct / revenueSharePct
                : null;

        return {
            ...row,
            costSharePct,
            revenueSharePct,
            costRevShareRatio,
            isTop3Flagged: false,
        };
    });

    const byRatio = [...enrichedRows].sort((a, b) => {
        const aRatio = a.costRevShareRatio ?? Number.NEGATIVE_INFINITY;
        const bRatio = b.costRevShareRatio ?? Number.NEGATIVE_INFINITY;
        if (Math.abs(bRatio - aRatio) > 1e-9) {
            return bRatio - aRatio;
        }
        return a.label.localeCompare(b.label);
    });

    const top3ByRatio = byRatio.filter((row) => row.costRevShareRatio !== null).slice(0, 3);
    const flaggedIds = new Set(top3ByRatio.map((row) => row.id));

    const flaggedRows = enrichedRows.map((row) => ({
        ...row,
        isTop3Flagged: flaggedIds.has(row.id),
    }));

    const rowsSortedByCost = [...flaggedRows].sort((a, b) => {
        if (Math.abs(b.totalCost - a.totalCost) > 1e-9) {
            return b.totalCost - a.totalCost;
        }
        const aRatio = a.costRevShareRatio ?? Number.NEGATIVE_INFINITY;
        const bRatio = b.costRevShareRatio ?? Number.NEGATIVE_INFINITY;
        if (Math.abs(bRatio - aRatio) > 1e-9) {
            return bRatio - aRatio;
        }
        return a.label.localeCompare(b.label);
    });

    const top3ByRatioWithFlags = rowsSortedByCost.filter((row) =>
        flaggedIds.has(row.id),
    );

    return {
        rowsSortedByCost,
        top3ByRatio: top3ByRatioWithFlags,
        totals: {
            revenue: totalRevenue,
            totalCost,
        },
    };
};

function App() {
    const [activeTab, setActiveTab] = useState('q1');
    const [inputs, setInputs] = useState<Inputs>(() => {
        if (typeof window === 'undefined') {
            return SEEDED_DEFAULT_INPUTS;
        }
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return SEEDED_DEFAULT_INPUTS;
        }
        try {
            const parsed = JSON.parse(stored) as Partial<Inputs>;
            return normaliseInputs(parsed);
        } catch {
            return SEEDED_DEFAULT_INPUTS;
        }
    });

    const [results, setResults] = useState<Results | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastCalculatedAt, setLastCalculatedAt] = useState<number | null>(
        null,
    );
    const [sectionOutputs, setSectionOutputs] = useState<SectionOutputs>({});
    const [sectionErrors, setSectionErrors] = useState<
        Record<string, string | null>
    >({});
    const [q2Results, setQ2Results] = useState<Q2Results | null>(null);
    const [q2Error, setQ2Error] = useState<string | null>(null);
    const [q2CalculatedAt, setQ2CalculatedAt] = useState<number | null>(null);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
    }, [inputs]);

    const parsedInputs = useMemo(() => parseInputs(inputs), [inputs]);

    const missingFields = useMemo(() => {
        return Q1_REQUIRED_FIELDS.filter((key) => parsedInputs[key] === null);
    }, [parsedInputs]);

    const q2MissingQ1Fields = useMemo(() => {
        return Q2_REQUIRED_Q1_FIELDS.filter((key) => parsedInputs[key] === null);
    }, [parsedInputs]);

    const q2MissingQ2Fields = useMemo(() => {
        return Q2_ONLY_FIELDS.filter((key) => parsedInputs[key] === null);
    }, [parsedInputs]);

    const q2DerivedRowsPreview = useMemo(() => {
        if (q2MissingQ1Fields.length > 0) {
            return null;
        }
        return computeQ2DerivedRowsFromQ1(parsedInputs as Record<FieldKey, number>);
    }, [parsedInputs, q2MissingQ1Fields]);

    const q2SortedRows = useMemo(() => {
        if (!q2Results) {
            return null;
        }
        return [...q2Results.rows].sort((a, b) => {
            const aPct = a.marginPct ?? Number.NEGATIVE_INFINITY;
            const bPct = b.marginPct ?? Number.NEGATIVE_INFINITY;
            if (Math.abs(bPct - aPct) > 1e-9) {
                return bPct - aPct;
            }
            return b.marginValue - a.marginValue;
        });
    }, [q2Results]);

    const q3Results = useMemo(
        () => (q2Results ? computeQ3ResultsFromQ2(q2Results) : null),
        [q2Results],
    );

    const handleChange = (key: FieldKey, value: string) => {
        setInputs((prev) => ({ ...prev, [key]: value }));
        setSectionOutputs({});
        setSectionErrors({});
        setQ2Results(null);
        setQ2Error(null);
        setQ2CalculatedAt(null);
    };

    const handleCalculate = () => {
        const computed = computeResults(parsedInputs);
        if (!computed) {
            setError(
                'Please fill in every field with a valid number before calculating.',
            );
            return;
        }
        setResults(computed);
        setError(null);
        setLastCalculatedAt(Date.now());
    };

    const handleSectionCalculate = (sectionId: string, fields: FieldKey[]) => {
        const missing = getSectionMissing(fields, parsedInputs);
        if (missing.length > 0) {
            setSectionErrors((prev) => ({
                ...prev,
                [sectionId]: 'Please fill in every field in this section.',
            }));
            return;
        }

        const v = parsedInputs as Record<FieldKey, number>;
        let output: SectionOutputs = {};

        if (sectionId === 'transport-revenue') {
            output = { 'transport-revenue': computeTransportRevenueSection(v) };
        }
        if (sectionId === 'wh-revenue') {
            output = { 'wh-revenue': computeWarehouseRevenueSection(v) };
        }
        if (sectionId === 'transport-cost') {
            output = { 'transport-cost': computeTransportCostSection(v) };
        }
        if (sectionId === 'wh-costs') {
            output = { 'wh-costs': computeWarehouseCostSection(v) };
        }

        setSectionOutputs((prev) => ({ ...prev, ...output }));
        setSectionErrors((prev) => ({ ...prev, [sectionId]: null }));
    };

    const handleQ2Calculate = () => {
        if (q2MissingQ1Fields.length > 0 || q2MissingQ2Fields.length > 0) {
            const missingParts: string[] = [];
            if (q2MissingQ1Fields.length > 0) {
                missingParts.push(`Q1 required: ${q2MissingQ1Fields.join(', ')}`);
            }
            if (q2MissingQ2Fields.length > 0) {
                missingParts.push(`Q2 required: ${q2MissingQ2Fields.join(', ')}`);
            }
            setQ2Error(missingParts.join(' | '));
            return;
        }

        const computed = computeQ2Results(parsedInputs as Record<FieldKey, number>);
        setQ2Results(computed);
        setQ2Error(null);
        setQ2CalculatedAt(Date.now());
    };

    const handleReset = () => {
        setInputs(SEEDED_DEFAULT_INPUTS);
        setResults(null);
        setError(null);
        setLastCalculatedAt(null);
        setSectionOutputs({});
        setSectionErrors({});
        setQ2Results(null);
        setQ2Error(null);
        setQ2CalculatedAt(null);
    };

    const renderValue = (
        value: number | null,
        formatter: (value: number) => string,
    ) => (value === null ? '—' : formatter(value));

    return (
        <div className="page">
            <header className="hero">
                <div>
                    <p className="eyebrow">Margin Scenario Workbook</p>
                    <h1>
                        Scenario modelling for work‑type mix across nine
                        questions.
                    </h1>
                    <p className="subhead">
                        Each tab contains the question, a short method overview,
                        and the full set of editable inputs.
                    </p>
                    <p className="subhead">
                        Questions 1–3 are active. Questions 4–9 are ready for
                        your next models.
                    </p>
                    <p className="subhead">
                        Default input figures represent the financial year up to
                        Period 10.
                    </p>
                </div>
                <div className="hero-card">
                    <h2>How to use this</h2>
                    <p>1. Enter all inputs (totals only).</p>
                    <p>2. Click Calculate.</p>
                    <p>3. Review totals and per‑work‑type margins.</p>
                    <p className="muted">
                        Inputs persist locally in your browser.
                    </p>
                </div>
            </header>

            <nav className="tabs" aria-label="Question tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            {activeTab === 'q1' ? (
                <main className="content">
                    <section className="question">
                        <div className="question-header">
                            <h2>Question 1</h2>
                            <h3>
                                What is the right combination of work types
                                (Consol, Groupage, Stock)?
                            </h3>
                            <p className="muted">
                                The model allocates revenue and costs to each
                                work type, then compares margin per pallet and
                                total margin.
                            </p>
                        </div>
                        <div className="question-method">
                            <h4>Method overview</h4>
                            <ul>
                                <li>
                                    Transport and warehouse values are entered
                                    as totals.
                                </li>
                                <li>
                                    Pallet volumes drive proportional
                                    allocation.
                                </li>
                                <li>
                                    Consol has no warehouse revenue but does
                                    carry RH&D costs.
                                </li>
                                <li>
                                    Secondary and breakdown warehouse items
                                    belong 100% to stock.
                                </li>
                                <li>
                                    Per‑pallet values are derived; totals are
                                    the decision focus.
                                </li>
                            </ul>
                        </div>
                    </section>

                    {SECTION_DEFS.map((section) => (
                        <section key={section.id} className="section-card">
                            <div className="section-header">
                                <h3>{section.title}</h3>
                                <p className="muted">{section.summary}</p>
                            </div>

                            {section.id === 'transport-revenue' && (
                                <div className="group-grid">
                                    {WORK_TYPES.map((type) => (
                                        <div
                                            key={`tr-${type}`}
                                            className="group-card"
                                        >
                                            <h4>{titleCase(type)}</h4>
                                            <div className="field-grid">
                                                {[
                                                    `${type}_trans_rev` as FieldKey,
                                                    `${type}_pallet_out` as FieldKey,
                                                ].map((key) => {
                                                    const field =
                                                        getFieldDef(key);
                                                    if (!field) {
                                                        return null;
                                                    }
                                                    const isMissing =
                                                        missingFields.includes(
                                                            key,
                                                        );
                                                    return (
                                                        <label
                                                            key={`${section.id}-${key}`}
                                                            className={`field ${isMissing ? 'missing' : ''}`}
                                                        >
                                                            <span>
                                                                {field.label}
                                                            </span>
                                                            <div
                                                                className={`input-wrap ${isMoneyField(key) ? 'money' : ''}`}
                                                            >
                                                                {isMoneyField(
                                                                    key,
                                                                ) && (
                                                                    <span className="input-prefix">
                                                                        £
                                                                    </span>
                                                                )}
                                                                <input
                                                                    type="number"
                                                                    inputMode="decimal"
                                                                    value={
                                                                        inputs[
                                                                            key
                                                                        ]
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        handleChange(
                                                                            key,
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {section.id === 'wh-revenue' && (
                                <div className="group-grid">
                                    <div className="group-card">
                                        <h4>Pallet volumes in</h4>
                                        <div className="subgroup-grid">
                                            <div className="subgroup">
                                                <h5>Consol</h5>
                                                <div className="field-grid">
                                                    {[
                                                        'consol_df_in',
                                                        'consol_pw_in',
                                                    ].map((key) => {
                                                        const field =
                                                            getFieldDef(
                                                                key as FieldKey,
                                                            );
                                                        if (!field) {
                                                            return null;
                                                        }
                                                        const isMissing =
                                                            missingFields.includes(
                                                                key as FieldKey,
                                                            );
                                                        return (
                                                            <label
                                                                key={`${section.id}-${key}`}
                                                                className={`field ${isMissing ? 'missing' : ''}`}
                                                            >
                                                                <span>
                                                                    {
                                                                        field.label
                                                                    }
                                                                </span>
                                                                <div
                                                                    className={`input-wrap ${isMoneyField(key as FieldKey) ? 'money' : ''}`}
                                                                >
                                                                    {isMoneyField(
                                                                        key as FieldKey,
                                                                    ) && (
                                                                        <span className="input-prefix">
                                                                            £
                                                                        </span>
                                                                    )}
                                                                    <input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        value={
                                                                            inputs[
                                                                                key as FieldKey
                                                                            ]
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            handleChange(
                                                                                key as FieldKey,
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="subgroup">
                                                <h5>Groupage</h5>
                                                <div className="field-grid">
                                                    {[
                                                        'groupage_df_in',
                                                        'groupage_pw_in',
                                                    ].map((key) => {
                                                        const field =
                                                            getFieldDef(
                                                                key as FieldKey,
                                                            );
                                                        if (!field) {
                                                            return null;
                                                        }
                                                        const isMissing =
                                                            missingFields.includes(
                                                                key as FieldKey,
                                                            );
                                                        return (
                                                            <label
                                                                key={`${section.id}-${key}`}
                                                                className={`field ${isMissing ? 'missing' : ''}`}
                                                            >
                                                                <span>
                                                                    {
                                                                        field.label
                                                                    }
                                                                </span>
                                                                <div
                                                                    className={`input-wrap ${isMoneyField(key as FieldKey) ? 'money' : ''}`}
                                                                >
                                                                    {isMoneyField(
                                                                        key as FieldKey,
                                                                    ) && (
                                                                        <span className="input-prefix">
                                                                            £
                                                                        </span>
                                                                    )}
                                                                    <input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        value={
                                                                            inputs[
                                                                                key as FieldKey
                                                                            ]
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            handleChange(
                                                                                key as FieldKey,
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="subgroup">
                                                <h5>Stock</h5>
                                                <div className="field-grid">
                                                    {['stock_in_total'].map(
                                                        (key) => {
                                                            const field =
                                                                getFieldDef(
                                                                    key as FieldKey,
                                                                );
                                                            if (!field) {
                                                                return null;
                                                            }
                                                            const isMissing =
                                                                missingFields.includes(
                                                                    key as FieldKey,
                                                                );
                                                            return (
                                                                <label
                                                                    key={`${section.id}-${key}`}
                                                                    className={`field ${isMissing ? 'missing' : ''}`}
                                                                >
                                                                    <span>
                                                                        {
                                                                            field.label
                                                                        }
                                                                    </span>
                                                                    <div
                                                                        className={`input-wrap ${isMoneyField(key as FieldKey) ? 'money' : ''}`}
                                                                    >
                                                                        {isMoneyField(
                                                                            key as FieldKey,
                                                                        ) && (
                                                                            <span className="input-prefix">
                                                                                £
                                                                            </span>
                                                                        )}
                                                                        <input
                                                                            type="number"
                                                                            inputMode="decimal"
                                                                            value={
                                                                                inputs[
                                                                                    key as FieldKey
                                                                                ]
                                                                            }
                                                                            onChange={(
                                                                                event,
                                                                            ) =>
                                                                                handleChange(
                                                                                    key as FieldKey,
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            placeholder="0"
                                                                        />
                                                                    </div>
                                                                </label>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="group-card">
                                        <h4>Revenue streams</h4>
                                        <div className="field-grid">
                                            {[
                                                'rhd_levy_rev',
                                                'secondary_storage_rev',
                                                'breakdown_restack_rev',
                                            ].map((key) => {
                                                const field = getFieldDef(
                                                    key as FieldKey,
                                                );
                                                if (!field) {
                                                    return null;
                                                }
                                                const isMissing =
                                                    missingFields.includes(
                                                        key as FieldKey,
                                                    );
                                                return (
                                                    <label
                                                        key={`${section.id}-${key}`}
                                                        className={`field ${isMissing ? 'missing' : ''}`}
                                                    >
                                                        <span>
                                                            {field.label}
                                                        </span>
                                                        <input
                                                            type="number"
                                                            inputMode="decimal"
                                                            value={
                                                                inputs[
                                                                    key as FieldKey
                                                                ]
                                                            }
                                                            onChange={(event) =>
                                                                handleChange(
                                                                    key as FieldKey,
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="0"
                                                        />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {section.id === 'transport-cost' && (
                                <div className="group-grid">
                                    {WORK_TYPES.map((type) => (
                                        <div
                                            key={`tc-${type}`}
                                            className="group-card"
                                        >
                                            <h4>{titleCase(type)}</h4>
                                            <div className="field-grid">
                                                {[
                                                    `${type}_direct_cost` as FieldKey,
                                                    ...(type === 'stock'
                                                        ? ([
                                                              'stock_transfer_cost',
                                                          ] as FieldKey[])
                                                        : []),
                                                    `${type}_pallet_out` as FieldKey,
                                                ].map((key) => {
                                                    const field =
                                                        getFieldDef(key);
                                                    if (!field) {
                                                        return null;
                                                    }
                                                    const isMissing =
                                                        missingFields.includes(
                                                            key,
                                                        );
                                                    return (
                                                        <label
                                                            key={`${section.id}-${key}`}
                                                            className={`field ${isMissing ? 'missing' : ''}`}
                                                        >
                                                            <span>
                                                                {field.label}
                                                            </span>
                                                            <div
                                                                className={`input-wrap ${isMoneyField(key) ? 'money' : ''}`}
                                                            >
                                                                {isMoneyField(
                                                                    key,
                                                                ) && (
                                                                    <span className="input-prefix">
                                                                        £
                                                                    </span>
                                                                )}
                                                                <input
                                                                    type="number"
                                                                    inputMode="decimal"
                                                                    value={
                                                                        inputs[
                                                                            key
                                                                        ]
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        handleChange(
                                                                            key,
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="group-card">
                                        <h4>Indirect costs</h4>
                                        <div className="field-grid">
                                            {[
                                                'total_indirect_fs_ewt',
                                                'ewt_indirect_cost',
                                            ].map((key) => {
                                                const field = getFieldDef(
                                                    key as FieldKey,
                                                );
                                                if (!field) {
                                                    return null;
                                                }
                                                const isMissing =
                                                    missingFields.includes(
                                                        key as FieldKey,
                                                    );
                                                return (
                                                    <label
                                                        key={`${section.id}-${key}`}
                                                        className={`field ${isMissing ? 'missing' : ''}`}
                                                    >
                                                        <span>
                                                            {field.label}
                                                        </span>
                                                        <div
                                                            className={`input-wrap ${isMoneyField(key as FieldKey) ? 'money' : ''}`}
                                                        >
                                                            {isMoneyField(
                                                                key as FieldKey,
                                                            ) && (
                                                                <span className="input-prefix">
                                                                    £
                                                                </span>
                                                            )}
                                                            <input
                                                                type="number"
                                                                inputMode="decimal"
                                                                value={
                                                                    inputs[
                                                                        key as FieldKey
                                                                    ]
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    handleChange(
                                                                        key as FieldKey,
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="group-card">
                                        <h4>Central costs</h4>
                                        <div className="field-grid">
                                            {[
                                                'total_central_transport_cost',
                                            ].map((key) => {
                                                const field = getFieldDef(
                                                    key as FieldKey,
                                                );
                                                if (!field) {
                                                    return null;
                                                }
                                                const isMissing =
                                                    missingFields.includes(
                                                        key as FieldKey,
                                                    );
                                                return (
                                                    <label
                                                        key={`${section.id}-${key}`}
                                                        className={`field ${isMissing ? 'missing' : ''}`}
                                                    >
                                                        <span>
                                                            {field.label}
                                                        </span>
                                                        <div
                                                            className={`input-wrap ${isMoneyField(key as FieldKey) ? 'money' : ''}`}
                                                        >
                                                            {isMoneyField(
                                                                key as FieldKey,
                                                            ) && (
                                                                <span className="input-prefix">
                                                                    £
                                                                </span>
                                                            )}
                                                            <input
                                                                type="number"
                                                                inputMode="decimal"
                                                                value={
                                                                    inputs[
                                                                        key as FieldKey
                                                                    ]
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    handleChange(
                                                                        key as FieldKey,
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {section.id === 'wh-costs' && (
                                <div className="group-grid">
                                    <div className="group-card">
                                        <h4>Dartford (DF)</h4>
                                        <div className="subgroup-grid">
                                            <div className="subgroup">
                                                <h5>RH&D/Levy</h5>
                                                <div className="field-grid">
                                                    {[
                                                        'df_rhd_direct_cost',
                                                        'df_rhd_indirect_cost',
                                                        'df_rhd_central_cost',
                                                    ].map((key) => {
                                                        const field =
                                                            getFieldDef(
                                                                key as FieldKey,
                                                            );
                                                        if (!field) {
                                                            return null;
                                                        }
                                                        const isMissing =
                                                            missingFields.includes(
                                                                key as FieldKey,
                                                            );
                                                        return (
                                                            <label
                                                                key={`${section.id}-${key}`}
                                                                className={`field ${isMissing ? 'missing' : ''}`}
                                                            >
                                                                <span>
                                                                    {
                                                                        field.label
                                                                    }
                                                                </span>
                                                                <div
                                                                    className={`input-wrap ${isMoneyField(key as FieldKey) ? 'money' : ''}`}
                                                                >
                                                                    {isMoneyField(
                                                                        key as FieldKey,
                                                                    ) && (
                                                                        <span className="input-prefix">
                                                                            £
                                                                        </span>
                                                                    )}
                                                                    <input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        value={
                                                                            inputs[
                                                                                key as FieldKey
                                                                            ]
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            handleChange(
                                                                                key as FieldKey,
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="subgroup">
                                                <h5>Secondary Storage/Levy</h5>
                                                <div className="field-grid">
                                                    {[
                                                        'df_secondary_direct_cost',
                                                        'df_secondary_indirect_cost',
                                                        'df_secondary_central_cost',
                                                    ].map((key) => {
                                                        const field =
                                                            getFieldDef(
                                                                key as FieldKey,
                                                            );
                                                        if (!field) {
                                                            return null;
                                                        }
                                                        const isMissing =
                                                            missingFields.includes(
                                                                key as FieldKey,
                                                            );
                                                        return (
                                                            <label
                                                                key={`${section.id}-${key}`}
                                                                className={`field ${isMissing ? 'missing' : ''}`}
                                                            >
                                                                <span>
                                                                    {
                                                                        field.label
                                                                    }
                                                                </span>
                                                                <div
                                                                    className={`input-wrap ${isMoneyField(key as FieldKey) ? 'money' : ''}`}
                                                                >
                                                                    {isMoneyField(
                                                                        key as FieldKey,
                                                                    ) && (
                                                                        <span className="input-prefix">
                                                                            £
                                                                        </span>
                                                                    )}
                                                                    <input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        value={
                                                                            inputs[
                                                                                key as FieldKey
                                                                            ]
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            handleChange(
                                                                                key as FieldKey,
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="subgroup">
                                                <h5>Breakdown/Restack</h5>
                                                <div className="field-grid">
                                                    {[
                                                        'df_breakdown_direct_cost',
                                                        'df_breakdown_indirect_cost',
                                                        'df_breakdown_central_cost',
                                                    ].map((key) => {
                                                        const field =
                                                            getFieldDef(
                                                                key as FieldKey,
                                                            );
                                                        if (!field) {
                                                            return null;
                                                        }
                                                        const isMissing =
                                                            missingFields.includes(
                                                                key as FieldKey,
                                                            );
                                                        return (
                                                            <label
                                                                key={`${section.id}-${key}`}
                                                                className={`field ${isMissing ? 'missing' : ''}`}
                                                            >
                                                                <span>
                                                                    {
                                                                        field.label
                                                                    }
                                                                </span>
                                                                <div
                                                                    className={`input-wrap ${isMoneyField(key as FieldKey) ? 'money' : ''}`}
                                                                >
                                                                    {isMoneyField(
                                                                        key as FieldKey,
                                                                    ) && (
                                                                        <span className="input-prefix">
                                                                            £
                                                                        </span>
                                                                    )}
                                                                    <input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        value={
                                                                            inputs[
                                                                                key as FieldKey
                                                                            ]
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            handleChange(
                                                                                key as FieldKey,
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="group-card">
                                        <h4>Paddock Wood (PW)</h4>
                                        <div className="subgroup-grid">
                                            <div className="subgroup">
                                                <h5>RH&D/Levy</h5>
                                                <div className="field-grid">
                                                    {[
                                                        'pw_rhd_direct_cost',
                                                        'pw_rhd_indirect_cost',
                                                        'pw_rhd_central_cost',
                                                    ].map((key) => {
                                                        const field =
                                                            getFieldDef(
                                                                key as FieldKey,
                                                            );
                                                        if (!field) {
                                                            return null;
                                                        }
                                                        const isMissing =
                                                            missingFields.includes(
                                                                key as FieldKey,
                                                            );
                                                        return (
                                                            <label
                                                                key={`${section.id}-${key}`}
                                                                className={`field ${isMissing ? 'missing' : ''}`}
                                                            >
                                                                <span>
                                                                    {
                                                                        field.label
                                                                    }
                                                                </span>
                                                                <div
                                                                    className={`input-wrap ${isMoneyField(key as FieldKey) ? 'money' : ''}`}
                                                                >
                                                                    {isMoneyField(
                                                                        key as FieldKey,
                                                                    ) && (
                                                                        <span className="input-prefix">
                                                                            £
                                                                        </span>
                                                                    )}
                                                                    <input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        value={
                                                                            inputs[
                                                                                key as FieldKey
                                                                            ]
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            handleChange(
                                                                                key as FieldKey,
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="subgroup">
                                                <h5>Secondary Storage/Levy</h5>
                                                <div className="field-grid">
                                                    {[
                                                        'pw_secondary_direct_cost',
                                                        'pw_secondary_indirect_cost',
                                                        'pw_secondary_central_cost',
                                                    ].map((key) => {
                                                        const field =
                                                            getFieldDef(
                                                                key as FieldKey,
                                                            );
                                                        if (!field) {
                                                            return null;
                                                        }
                                                        const isMissing =
                                                            missingFields.includes(
                                                                key as FieldKey,
                                                            );
                                                        return (
                                                            <label
                                                                key={`${section.id}-${key}`}
                                                                className={`field ${isMissing ? 'missing' : ''}`}
                                                            >
                                                                <span>
                                                                    {
                                                                        field.label
                                                                    }
                                                                </span>
                                                                <div
                                                                    className={`input-wrap ${isMoneyField(key as FieldKey) ? 'money' : ''}`}
                                                                >
                                                                    {isMoneyField(
                                                                        key as FieldKey,
                                                                    ) && (
                                                                        <span className="input-prefix">
                                                                            £
                                                                        </span>
                                                                    )}
                                                                    <input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        value={
                                                                            inputs[
                                                                                key as FieldKey
                                                                            ]
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            handleChange(
                                                                                key as FieldKey,
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="subgroup">
                                                <h5>Breakdown/Restack</h5>
                                                <div className="field-grid">
                                                    {[
                                                        'pw_breakdown_direct_cost',
                                                        'pw_breakdown_indirect_cost',
                                                        'pw_breakdown_central_cost',
                                                    ].map((key) => {
                                                        const field =
                                                            getFieldDef(
                                                                key as FieldKey,
                                                            );
                                                        if (!field) {
                                                            return null;
                                                        }
                                                        const isMissing =
                                                            missingFields.includes(
                                                                key as FieldKey,
                                                            );
                                                        return (
                                                            <label
                                                                key={`${section.id}-${key}`}
                                                                className={`field ${isMissing ? 'missing' : ''}`}
                                                            >
                                                                <span>
                                                                    {
                                                                        field.label
                                                                    }
                                                                </span>
                                                                <div
                                                                    className={`input-wrap ${isMoneyField(key as FieldKey) ? 'money' : ''}`}
                                                                >
                                                                    {isMoneyField(
                                                                        key as FieldKey,
                                                                    ) && (
                                                                        <span className="input-prefix">
                                                                            £
                                                                        </span>
                                                                    )}
                                                                    <input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        value={
                                                                            inputs[
                                                                                key as FieldKey
                                                                            ]
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            handleChange(
                                                                                key as FieldKey,
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="section-actions">
                                <button
                                    type="button"
                                    className="ghost-button"
                                    onClick={() =>
                                        handleSectionCalculate(
                                            section.id,
                                            section.fields,
                                        )
                                    }
                                >
                                    Calculate{' '}
                                    {section.title.split('.')[1]?.trim() ??
                                        'Section'}
                                </button>
                                {sectionErrors[section.id] && (
                                    <span className="error">
                                        {sectionErrors[section.id]}
                                    </span>
                                )}
                            </div>

                            {section.id === 'transport-revenue' &&
                                sectionOutputs['transport-revenue'] && (
                                    <div className="section-results">
                                        <h4>Transport revenue per pallet</h4>
                                        <div className="section-metrics">
                                            {WORK_TYPES.map((type) => (
                                                <div
                                                    key={`tr-${type}`}
                                                    className="metric"
                                                >
                                                    <span>
                                                        {titleCase(type)}
                                                    </span>
                                                    <strong>
                                                        {renderValue(
                                                            sectionOutputs[
                                                                'transport-revenue'
                                                            ]?.perPallet[
                                                                type
                                                            ] ?? null,
                                                            formatCurrency,
                                                        )}
                                                    </strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            {section.id === 'wh-revenue' &&
                                sectionOutputs['wh-revenue'] && (
                                    <div className="section-results">
                                        <h4>Warehouse revenue allocation</h4>
                                        <div className="section-metrics">
                                            {WORK_TYPES.map((type) => (
                                                <div
                                                    key={`whrev-${type}`}
                                                    className="metric"
                                                >
                                                    <span>
                                                        {titleCase(type)}{' '}
                                                        revenue / pallet
                                                    </span>
                                                    <strong>
                                                        {renderValue(
                                                            sectionOutputs[
                                                                'wh-revenue'
                                                            ]?.revenuePerPallet[
                                                                type
                                                            ] ?? null,
                                                            formatCurrency,
                                                        )}
                                                    </strong>
                                                    <span className="metric-note">
                                                        Allocated:{' '}
                                                        {formatCurrency(
                                                            sectionOutputs[
                                                                'wh-revenue'
                                                            ]?.allocatedRevenue[
                                                                type
                                                            ] ?? 0,
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            {section.id === 'transport-cost' &&
                                sectionOutputs['transport-cost'] && (
                                    <div className="section-results">
                                        <h4>Transport cost per pallet</h4>
                                        <div className="section-metrics">
                                            {WORK_TYPES.map((type) => (
                                                <div
                                                    key={`trcost-${type}`}
                                                    className="metric"
                                                >
                                                    <span>
                                                        {titleCase(type)}
                                                    </span>
                                                    <strong>
                                                        {renderValue(
                                                            sectionOutputs[
                                                                'transport-cost'
                                                            ]?.costPerPallet[
                                                                type
                                                            ] ?? null,
                                                            formatCurrency,
                                                        )}
                                                    </strong>
                                                    <span className="metric-note">
                                                        Indirect:{' '}
                                                        {formatCurrency(
                                                            sectionOutputs[
                                                                'transport-cost'
                                                            ]?.indirectShares[
                                                                type
                                                            ] ?? 0,
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            {section.id === 'wh-costs' &&
                                sectionOutputs['wh-costs'] && (
                                    <div className="section-results">
                                        <h4>Warehouse cost per pallet</h4>
                                        <div className="section-metrics">
                                            {WORK_TYPES.map((type) => (
                                                <div
                                                    key={`whcost-${type}`}
                                                    className="metric"
                                                >
                                                    <span>
                                                        {titleCase(type)}
                                                    </span>
                                                    <strong>
                                                        {renderValue(
                                                            sectionOutputs[
                                                                'wh-costs'
                                                            ]?.costPerPallet[
                                                                type
                                                            ] ?? null,
                                                            formatCurrency,
                                                        )}
                                                    </strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                        </section>
                    ))}

                    <section className="actions">
                        <div>
                            <button
                                type="button"
                                className="primary-button"
                                onClick={handleCalculate}
                                disabled={missingFields.length > 0}
                            >
                                Calculate
                            </button>
                            <button
                                type="button"
                                className="ghost-button"
                                onClick={handleReset}
                            >
                                Reset inputs
                            </button>
                        </div>
                        <div className="status">
                            {missingFields.length > 0 && (
                                <span>
                                    Complete all fields to enable calculation.
                                </span>
                            )}
                            {error && <span className="error">{error}</span>}
                        </div>
                    </section>

                    <section className="results">
                        <div className="section-header">
                            <h3>Outputs</h3>
                            <p className="muted">
                                Totals update when you press Calculate.
                            </p>
                        </div>
                        <div className="totals-grid">
                            <div className="metric">
                                <span>Total revenue</span>
                                <strong>
                                    {results
                                        ? formatCurrency(
                                              results.totals.totalRevenue,
                                          )
                                        : '—'}
                                </strong>
                            </div>
                            <div className="metric">
                                <span>Total cost</span>
                                <strong>
                                    {results
                                        ? formatCurrency(
                                              results.totals.totalCost,
                                          )
                                        : '—'}
                                </strong>
                            </div>
                            <div className="metric">
                                <span>Total margin</span>
                                <strong>
                                    {results
                                        ? formatCurrency(
                                              results.totals.totalMargin,
                                          )
                                        : '—'}
                                </strong>
                            </div>
                            <div className="metric">
                                <span>Overall margin %</span>
                                <strong>
                                    {results
                                        ? formatPercent(
                                              results.totals.overallMarginPct,
                                          )
                                        : '—'}
                                </strong>
                            </div>
                        </div>

                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Work type</th>
                                        <th>Pallets IN</th>
                                        <th>Pallets OUT</th>
                                        <th>WH Rev / IN</th>
                                        <th>TR Rev / OUT</th>
                                        <th>WH Cost / IN</th>
                                        <th>TR Cost / OUT</th>
                                        <th>Margin / pallet</th>
                                        <th>Total revenue</th>
                                        <th>Total cost</th>
                                        <th>Total margin</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {WORK_TYPES.map((type) => {
                                        const row = results?.perType[type];
                                        return (
                                            <tr key={type}>
                                                <td>{titleCase(type)}</td>
                                                <td>
                                                    {row
                                                        ? formatNumber(
                                                              row.palletsIn,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td>
                                                    {row
                                                        ? formatNumber(
                                                              row.palletsOut,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td>
                                                    {row
                                                        ? renderValue(
                                                              row.whRevenuePerIn,
                                                              formatCurrency,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td>
                                                    {row
                                                        ? renderValue(
                                                              row.transRevenuePerOut,
                                                              formatCurrency,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td>
                                                    {row
                                                        ? renderValue(
                                                              row.whCostPerIn,
                                                              formatCurrency,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td>
                                                    {row
                                                        ? renderValue(
                                                              row.transCostPerOut,
                                                              formatCurrency,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td>
                                                    {row
                                                        ? renderValue(
                                                              row.marginPerPallet,
                                                              formatCurrency,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td>
                                                    {row
                                                        ? formatCurrency(
                                                              row.totalRevenue,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td>
                                                    {row
                                                        ? formatCurrency(
                                                              row.totalCost,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td>
                                                    {row
                                                        ? formatCurrency(
                                                              row.totalMargin,
                                                          )
                                                        : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="section-results">
                            <h4>Margin per pallet (by work type)</h4>
                            <div className="section-metrics">
                                {WORK_TYPES.map((type) => (
                                    <div
                                        key={`final-mpp-${type}`}
                                        className="metric"
                                    >
                                        <span>{titleCase(type)}</span>
                                        <strong>
                                            {results
                                                ? renderValue(
                                                      results.perType[type]
                                                          .marginPerPallet,
                                                      formatCurrency,
                                                  )
                                                : '—'}
                                        </strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </main>
            ) : activeTab === 'q2' ? (
                <main className="content">
                    <section className="question">
                        <div className="question-header">
                            <h2>Question 2</h2>
                            <h3>
                                What are the margins for each individual revenue
                                stream across the Group?
                            </h3>
                            <p className="muted">
                                Q2 reuses Q1 stream values and adds dedicated
                                YTD inputs for Express and QC.
                            </p>
                        </div>
                        <div className="question-method">
                            <h4>Method overview</h4>
                            <ul>
                                <li>Highest margin activity is ranked by margin %.</li>
                                <li>
                                    DIS streams use an interim split
                                    (Consol/Groupage/Stock) and need validation.
                                </li>
                                <li>
                                    WH RH&amp;D, Storage, and Breakdown/Restack
                                    are pulled from Q1 fields.
                                </li>
                                <li>
                                    EXP and QC are entered directly for Q2.
                                </li>
                            </ul>
                        </div>
                    </section>

                    <section className="section-card">
                        <div className="section-header">
                            <h3>Q2 inputs</h3>
                            <p className="muted">
                                Fill these additional fields for Q2.
                            </p>
                        </div>
                        <div className="group-grid">
                            <div className="group-card">
                                <h4>Express (EXP)</h4>
                                <div className="field-grid">
                                    {[
                                        'exp_rev',
                                        'exp_direct_cost',
                                        'exp_indirect_cost',
                                    ].map((key) => (
                                        <label
                                            key={key}
                                            className={`field ${q2MissingQ2Fields.includes(key as FieldKey) ? 'missing' : ''}`}
                                        >
                                            <span>
                                                {getFieldDef(key as FieldKey)
                                                    ?.label ?? key}
                                            </span>
                                            <div className="input-wrap money">
                                                <span className="input-prefix">
                                                    £
                                                </span>
                                                <input
                                                    type="number"
                                                    inputMode="decimal"
                                                    value={
                                                        inputs[key as FieldKey]
                                                    }
                                                    onChange={(event) =>
                                                        handleChange(
                                                            key as FieldKey,
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="0"
                                                />
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="group-card">
                                <h4>QC (Surveys)</h4>
                                <div className="field-grid">
                                    {[
                                        'qc_rev',
                                        'qc_direct_cost',
                                        'qc_indirect_cost',
                                        'qc_central_cost',
                                    ].map((key) => (
                                        <label
                                            key={key}
                                            className={`field ${q2MissingQ2Fields.includes(key as FieldKey) ? 'missing' : ''}`}
                                        >
                                            <span>
                                                {getFieldDef(key as FieldKey)
                                                    ?.label ?? key}
                                            </span>
                                            <div className="input-wrap money">
                                                <span className="input-prefix">
                                                    £
                                                </span>
                                                <input
                                                    type="number"
                                                    inputMode="decimal"
                                                    value={
                                                        inputs[key as FieldKey]
                                                    }
                                                    onChange={(event) =>
                                                        handleChange(
                                                            key as FieldKey,
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="0"
                                                />
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="section-card">
                        <div className="section-header">
                            <h3>DIS stream status</h3>
                            <p className="muted">
                                Interim mapping in use: Consol, Groupage, Stock.
                                Confirm final DIS stream set before final release.
                            </p>
                        </div>
                    </section>

                    <section className="section-card">
                        <div className="section-header">
                            <h3>Q1-filled DIS and WH streams</h3>
                            <p className="muted">
                                These values are auto-filled from Q1 and used in
                                Q2 calculations.
                            </p>
                        </div>
                        {q2DerivedRowsPreview ? (
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Stream</th>
                                            <th>Revenue</th>
                                            <th>Direct Cost</th>
                                            <th>Indirect Cost</th>
                                            <th>Central Cost</th>
                                            <th>Total Cost</th>
                                            <th>Margin (£)</th>
                                            <th>Margin %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {q2DerivedRowsPreview.map((row) => (
                                            <tr key={`q2-preview-${row.id}`}>
                                                <td>{row.label}</td>
                                                <td>{formatCurrency(row.revenue)}</td>
                                                <td>{formatCurrency(row.directCost)}</td>
                                                <td>{formatCurrency(row.indirectCost)}</td>
                                                <td>{formatCurrency(row.centralCost)}</td>
                                                <td>{formatCurrency(row.totalCost)}</td>
                                                <td>{formatCurrency(row.marginValue)}</td>
                                                <td>
                                                    {renderValue(
                                                        row.marginPct,
                                                        formatPercent,
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="muted">
                                Complete required Q1 fields to preview
                                auto-filled DIS/WH values.
                            </p>
                        )}
                    </section>

                    <section className="actions">
                        <div>
                            <button
                                type="button"
                                className="primary-button"
                                onClick={handleQ2Calculate}
                            >
                                Calculate Q2
                            </button>
                        </div>
                        <div className="status">
                            {q2Error && <span className="error">{q2Error}</span>}
                            {!q2Error && q2CalculatedAt && (
                                <span className="muted">
                                    Calculated at{' '}
                                    {new Date(q2CalculatedAt).toLocaleTimeString(
                                        'en-GB',
                                    )}
                                    .
                                </span>
                            )}
                        </div>
                    </section>

                    <section className="results">
                        <div className="section-header">
                            <h3>Q2 outputs</h3>
                            <p className="muted">
                                Margin by individual revenue stream.
                            </p>
                        </div>

                        <div className="totals-grid">
                            <div className="metric">
                                <span>Total revenue</span>
                                <strong>
                                    {q2Results
                                        ? formatCurrency(q2Results.totals.revenue)
                                        : '—'}
                                </strong>
                            </div>
                            <div className="metric">
                                <span>Total cost</span>
                                <strong>
                                    {q2Results
                                        ? formatCurrency(q2Results.totals.totalCost)
                                        : '—'}
                                </strong>
                            </div>
                            <div className="metric">
                                <span>Total margin</span>
                                <strong>
                                    {q2Results
                                        ? formatCurrency(q2Results.totals.marginValue)
                                        : '—'}
                                </strong>
                            </div>
                            <div className="metric">
                                <span>Overall margin %</span>
                                <strong>
                                    {q2Results
                                        ? renderValue(
                                              q2Results.totals.marginPct,
                                              formatPercent,
                                          )
                                        : '—'}
                                </strong>
                            </div>
                        </div>

                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Stream</th>
                                        <th>Revenue</th>
                                        <th>Direct Cost</th>
                                        <th>Indirect Cost</th>
                                        <th>Central Cost</th>
                                        <th>Total Cost</th>
                                        <th>Margin (£)</th>
                                        <th>Margin %</th>
                                        <th>Source</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {q2SortedRows ? (
                                        q2SortedRows.map((row) => (
                                            <tr key={row.id}>
                                                <td>{row.label}</td>
                                                <td>{formatCurrency(row.revenue)}</td>
                                                <td>{formatCurrency(row.directCost)}</td>
                                                <td>{formatCurrency(row.indirectCost)}</td>
                                                <td>{formatCurrency(row.centralCost)}</td>
                                                <td>{formatCurrency(row.totalCost)}</td>
                                                <td>{formatCurrency(row.marginValue)}</td>
                                                <td>
                                                    {renderValue(
                                                        row.marginPct,
                                                        formatPercent,
                                                    )}
                                                </td>
                                                <td>{row.source}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={9}>
                                                Run Q2 calculation to view stream
                                                margins.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="section-results">
                            <h4>Highest margin activity (by margin %)</h4>
                            {q2Results?.winnerByMarginPct ? (
                                <div className="section-metrics">
                                    <div className="metric">
                                        <span>Activity</span>
                                        <strong>
                                            {q2Results.winnerByMarginPct.label}
                                        </strong>
                                    </div>
                                    <div className="metric">
                                        <span>Margin %</span>
                                        <strong>
                                            {renderValue(
                                                q2Results.winnerByMarginPct
                                                    .marginPct,
                                                formatPercent,
                                            )}
                                        </strong>
                                    </div>
                                    <div className="metric">
                                        <span>Margin (£)</span>
                                        <strong>
                                            {formatCurrency(
                                                q2Results.winnerByMarginPct
                                                    .marginValue,
                                            )}
                                        </strong>
                                    </div>
                                </div>
                            ) : (
                                <p className="muted">
                                    No winner available yet.
                                </p>
                            )}
                        </div>
                    </section>
                </main>
            ) : activeTab === 'q3' ? (
                <main className="content">
                    <section className="question">
                        <div className="question-header">
                            <h2>Question 3</h2>
                            <h3>
                                What areas command a large proportion of costs
                                but produce a small proportion of revenue?
                            </h3>
                            <p className="muted">
                                Q3 uses Q2 stream outputs and highlights
                                cost-heavy, revenue-light streams.
                            </p>
                        </div>
                        <div className="question-method">
                            <h4>Method overview</h4>
                            <ul>
                                <li>Sort streams by total cost (high to low).</li>
                                <li>Show revenue share and cost share by stream.</li>
                                <li>
                                    Compute Cost/Rev % Ratio = Cost Share % /
                                    Revenue Share %.
                                </li>
                                <li>
                                    Flag top 3 streams with the highest ratio.
                                </li>
                            </ul>
                        </div>
                    </section>

                    {!q3Results ? (
                        <section className="section-card">
                            <div className="section-header">
                                <h3>Q3 dependency</h3>
                                <p className="muted">
                                    Run Q2 first to generate stream-level data
                                    for Q3.
                                </p>
                            </div>
                        </section>
                    ) : (
                        <>
                            <section className="results">
                                <div className="section-header">
                                    <h3>Q3 summary</h3>
                                    <p className="muted">
                                        Portfolio cost/revenue concentration view
                                        by stream.
                                    </p>
                                </div>
                                <div className="totals-grid">
                                    <div className="metric">
                                        <span>Total revenue</span>
                                        <strong>
                                            {formatCurrency(
                                                q3Results.totals.revenue,
                                            )}
                                        </strong>
                                    </div>
                                    <div className="metric">
                                        <span>Total cost</span>
                                        <strong>
                                            {formatCurrency(
                                                q3Results.totals.totalCost,
                                            )}
                                        </strong>
                                    </div>
                                    <div className="metric">
                                        <span>Streams analysed</span>
                                        <strong>
                                            {formatNumber(
                                                q3Results.rowsSortedByCost.length,
                                            )}
                                        </strong>
                                    </div>
                                    <div className="metric">
                                        <span>Flagged streams</span>
                                        <strong>
                                            {formatNumber(
                                                q3Results.top3ByRatio.length,
                                            )}
                                        </strong>
                                    </div>
                                </div>
                            </section>

                            <section className="results">
                                <div className="section-header">
                                    <h3>Q3 stream analysis</h3>
                                    <p className="muted">
                                        Sorted by total cost, with imbalance
                                        flags based on cost/revenue share ratio.
                                    </p>
                                </div>
                                <div className="table-wrap">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Stream</th>
                                                <th>Total Cost</th>
                                                <th>Cost Share %</th>
                                                <th>Revenue</th>
                                                <th>Revenue Share %</th>
                                                <th>Cost/Rev % Ratio</th>
                                                <th>Flag</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {q3Results.rowsSortedByCost.map(
                                                (row) => (
                                                    <tr key={`q3-${row.id}`}>
                                                        <td>{row.label}</td>
                                                        <td>
                                                            {formatCurrency(
                                                                row.totalCost,
                                                            )}
                                                        </td>
                                                        <td>
                                                            {renderValue(
                                                                row.costSharePct,
                                                                formatPercent,
                                                            )}
                                                        </td>
                                                        <td>
                                                            {formatCurrency(
                                                                row.revenue,
                                                            )}
                                                        </td>
                                                        <td>
                                                            {renderValue(
                                                                row.revenueSharePct,
                                                                formatPercent,
                                                            )}
                                                        </td>
                                                        <td>
                                                            {renderValue(
                                                                row.costRevShareRatio,
                                                                formatNumber,
                                                            )}
                                                        </td>
                                                        <td>
                                                            {row.isTop3Flagged
                                                                ? 'High imbalance'
                                                                : '—'}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="section-results">
                                <h4>Top 3 cost-heavy / revenue-light streams</h4>
                                <div className="section-metrics">
                                    {q3Results.top3ByRatio.length > 0 ? (
                                        q3Results.top3ByRatio.map((row) => (
                                            <div
                                                key={`q3-top-${row.id}`}
                                                className="metric"
                                            >
                                                <span>{row.label}</span>
                                                <strong>
                                                    Ratio:{' '}
                                                    {renderValue(
                                                        row.costRevShareRatio,
                                                        formatNumber,
                                                    )}
                                                </strong>
                                                <span className="metric-note">
                                                    Cost share:{' '}
                                                    {renderValue(
                                                        row.costSharePct,
                                                        formatPercent,
                                                    )}
                                                </span>
                                                <span className="metric-note">
                                                    Revenue share:{' '}
                                                    {renderValue(
                                                        row.revenueSharePct,
                                                        formatPercent,
                                                    )}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="muted">
                                            No ratio values available to rank.
                                        </p>
                                    )}
                                </div>
                            </section>
                        </>
                    )}
                </main>
            ) : (
                <main className="content">
                    <section className="placeholder">
                        <h2>
                            {tabs.find((tab) => tab.id === activeTab)?.label}
                        </h2>
                        <p className="muted">
                            Question details and interactive model will be added
                            here.
                        </p>
                    </section>
                </main>
            )}
        </div>
    );
}

export default App;
