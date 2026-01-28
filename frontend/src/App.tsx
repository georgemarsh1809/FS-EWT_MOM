import { useEffect, useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import "./App.css";
import { useScenarioStore } from "./store/useScenarioStore";
import type { ScenarioTypeResult, WorkType } from "./types";

const WORK_TYPES: WorkType[] = ["consolidation", "groupage", "stock"];
const MAX_PALLETS = 200000;

const COLORS = ["#2563EB", "#F97316", "#16A34A"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2
  }).format(value);

const formatNumber = (value: number) => new Intl.NumberFormat("en-GB").format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "percent",
    maximumFractionDigits: 1
  }).format(value);

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function App() {
  const {
    scopeId,
    rates,
    inputs,
    lockTotalIn,
    lockTotalOut,
    results,
    loading,
    error,
    setLockTotalIn,
    setLockTotalOut,
    updatePallets,
    fetchRates,
    runScenario
  } = useScenarioStore();

  useEffect(() => {
    if (!scopeId) {
      return;
    }
    fetchRates(scopeId).then(() => {
      void runScenario();
    });
  }, [scopeId, fetchRates, runScenario]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runScenario();
    }, 200);

    return () => window.clearTimeout(timer);
  }, [inputs, scopeId, runScenario]);

  const inputTotals = useMemo(() => {
    const totalIn = WORK_TYPES.reduce((sum, key) => sum + inputs[key].pallets_in, 0);
    const totalOut = WORK_TYPES.reduce((sum, key) => sum + inputs[key].pallets_out, 0);
    return { totalIn, totalOut };
  }, [inputs]);

  const chartDataIn = WORK_TYPES.map((type, index) => ({
    name: titleCase(type),
    value: inputs[type].pallets_in,
    color: COLORS[index]
  }));

  const chartDataOut = WORK_TYPES.map((type, index) => ({
    name: titleCase(type),
    value: inputs[type].pallets_out,
    color: COLORS[index]
  }));

  const marginData = WORK_TYPES.map((type) => ({
    name: titleCase(type),
    value: results?.per_type[type].total_margin ?? 0
  }));

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Pallet Mix Scenario Modeller · V1</p>
          <h1>Unit economics stay fixed. Your volumes drive the outcome.</h1>
          <p className="subhead">
            Adjust pallets in and out for each work type to see revenue, cost, margin, and contribution by lane.
          </p>
          <p className="subhead">
            This is a static unit-economics scenario model. It explores margin sensitivity to volume mix, not
            operational feasibility or demand behaviour.
          </p>
        </div>
        <div className="scope-card">
          <div className="lock-row">
            <label className="toggle">
              <input
                type="checkbox"
                checked={lockTotalIn}
                onChange={(event) => setLockTotalIn(event.target.checked)}
              />
              Lock total IN ({formatNumber(inputTotals.totalIn)})
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={lockTotalOut}
                onChange={(event) => setLockTotalOut(event.target.checked)}
              />
              Lock total OUT ({formatNumber(inputTotals.totalOut)})
            </label>
          </div>
          {loading && <p className="status">Updating scenario…</p>}
          {error && <p className="status error">{error}</p>}
        </div>
      </header>

      <section className="how-it-works">
        <div className="section-title">
          <h2>How it works</h2>
          <p>Per-pallet economics are fixed; changing volumes scales totals.</p>
        </div>
        <div className="how-grid">
          <div>
            <h3>Fixed inputs</h3>
            <ul>
              <li>Warehouse revenue/cost per IN pallet</li>
              <li>Transport revenue/cost per OUT pallet</li>
              <li>Derived static margins per pallet</li>
            </ul>
          </div>
          <div>
            <h3>Scenario math</h3>
            <ul>
              <li>Warehouse totals = pallets IN × per‑pallet rates</li>
              <li>Transport totals = pallets OUT × per‑pallet rates</li>
              <li>Total margin = total revenue − total cost</li>
            </ul>
          </div>
          <div>
            <h3>Blended metric</h3>
            <ul>
              <li>Blended margin / total pallets is dynamic</li>
              <li>All other per‑pallet margins stay static</li>
              <li>Overall margin % = total margin / total revenue</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="context">
        <details>
          <summary>Important context</summary>
          <div className="context-body">
            <h3>IMPORTANT CONTEXT</h3>
            <p>
              Warehouse and transport revenue and cost per pallet are treated as averages derived from real data.
            </p>
            <p>Volume is the lever.</p>
            <p>
              We are asking: if the mix of work changes, what happens to total profit and margin?
              Locking total IN and OUT is realistic since this mirrors a real constraint: finite warehouse throughput
              and finite transport capacity.
            </p>
            <h4>We are NOT:</h4>
            <ul>
              <li>modelling pricing changes</li>
              <li>modelling operational step costs</li>
              <li>modelling service degradation, overtime, or failure modes</li>
              <li>modelling customer behaviour</li>
            </ul>
            <h4>The biggest simplification is this:</h4>
            <p>
              We’re assuming pallets IN and pallets OUT are independently adjustable. In real operations, they are
              linked.
            </p>
          </div>
        </details>
      </section>

      <section className="controls">
        <div className="section-title">
          <h2>Volume controls</h2>
          <p>Set pallets IN and OUT per work type. Integer-only, per-pallet margins stay fixed.</p>
        </div>
        <div className="controls-grid">
          {WORK_TYPES.map((type) => (
            <div key={type} className="control-card">
              <h3>{titleCase(type)}</h3>
              <div className="control">
                <label htmlFor={`${type}-in`}>Pallets IN</label>
                <div className="control-inputs">
                  <input
                    id={`${type}-in`}
                    type="range"
                    min={0}
                    max={MAX_PALLETS}
                    value={inputs[type].pallets_in}
                    onChange={(event) => updatePallets(type, "pallets_in", Number(event.target.value))}
                  />
                  <input
                    type="number"
                    min={0}
                    value={inputs[type].pallets_in}
                    onChange={(event) => updatePallets(type, "pallets_in", Number(event.target.value))}
                  />
                </div>
              </div>
              <div className="control">
                <label htmlFor={`${type}-out`}>Pallets OUT</label>
                <div className="control-inputs">
                  <input
                    id={`${type}-out`}
                    type="range"
                    min={0}
                    max={MAX_PALLETS}
                    value={inputs[type].pallets_out}
                    onChange={(event) => updatePallets(type, "pallets_out", Number(event.target.value))}
                  />
                  <input
                    type="number"
                    min={0}
                    value={inputs[type].pallets_out}
                    onChange={(event) => updatePallets(type, "pallets_out", Number(event.target.value))}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="results">
        <div className="section-title">
          <h2>Scenario results</h2>
          <p>Warehouse and transport margins per pallet remain static for the selected scope.</p>
        </div>
        <div className="totals-card">
          <h3>Totals</h3>
          {results ? (
            <div className="totals-grid">
              <div>
                <span>Total revenue</span>
                <strong>{formatCurrency(results.totals.total_revenue)}</strong>
              </div>
              <div>
                <span>Total cost</span>
                <strong>{formatCurrency(results.totals.total_cost)}</strong>
              </div>
              <div>
                <span>Total margin</span>
                <strong>{formatCurrency(results.totals.total_margin)}</strong>
              </div>
              <div>
                <span>Overall margin %</span>
                <strong>{formatPercent(results.totals.overall_margin_pct)}</strong>
              </div>
            </div>
          ) : (
            <p className="status">Run a scenario to see totals.</p>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Work type</th>
                <th>IN</th>
                <th>OUT</th>
                <th>WH rev</th>
                <th>WH cost</th>
                <th>WH margin</th>
                <th>TR rev</th>
                <th>TR cost</th>
                <th>TR margin</th>
                <th>Total rev</th>
                <th>Total cost</th>
                <th>Total margin</th>
                <th>WH margin / IN (static)</th>
                <th>TR margin / OUT (static)</th>
                <th>Blended margin / total pallets</th>
              </tr>
            </thead>
            <tbody>
              {WORK_TYPES.map((type) => {
                const row: ScenarioTypeResult | undefined = results?.per_type[type];
                return (
                  <tr key={type}>
                    <td>{titleCase(type)}</td>
                    <td>{row ? formatNumber(row.pallets_in) : "—"}</td>
                    <td>{row ? formatNumber(row.pallets_out) : "—"}</td>
                    <td>{row ? formatCurrency(row.wh_revenue) : "—"}</td>
                    <td>{row ? formatCurrency(row.wh_cost) : "—"}</td>
                    <td>{row ? formatCurrency(row.wh_margin) : "—"}</td>
                    <td>{row ? formatCurrency(row.trans_revenue) : "—"}</td>
                    <td>{row ? formatCurrency(row.trans_cost) : "—"}</td>
                    <td>{row ? formatCurrency(row.trans_margin) : "—"}</td>
                    <td>{row ? formatCurrency(row.total_revenue) : "—"}</td>
                    <td>{row ? formatCurrency(row.total_cost) : "—"}</td>
                    <td>{row ? formatCurrency(row.total_margin) : "—"}</td>
                    <td>{row ? formatCurrency(row.wh_margin_per_in_pallet) : "—"}</td>
                    <td>{row ? formatCurrency(row.trans_margin_per_out_pallet) : "—"}</td>
                    <td>{row ? formatCurrency(row.blended_margin_per_total_pallets) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="charts">
        <div className="section-title">
          <h2>Mix and contribution</h2>
          <p>Compare IN/OUT mix and total margin contribution by work type.</p>
        </div>
        <div className="charts-grid">
          <div className="chart-card">
            <h3>IN pallets mix</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={chartDataIn} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                  {chartDataIn.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatNumber(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h3>OUT pallets mix</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={chartDataOut} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                  {chartDataOut.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatNumber(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h3>Total margin contribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={marginData}>
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatNumber(value)} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#0F172A">
                  {marginData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div>
          <strong>Static unit economics:</strong>
          <span>
            {rates
              ? `Warehouse margin/IN and Transport margin/OUT stay fixed for ${rates.scope_label}.`
              : "Load a scope to see per-pallet economics."}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
