import type { RatesResponse, ScenarioRunRequest, ScenarioRunResponse, ScopeItem } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return response.json() as Promise<T>;
}

export async function getScopes(): Promise<ScopeItem[]> {
  const response = await fetch(`${API_BASE}/api/rates/scopes`);
  return handle<ScopeItem[]>(response);
}

export async function getRates(scopeId: string): Promise<RatesResponse> {
  const response = await fetch(`${API_BASE}/api/rates?scope=${encodeURIComponent(scopeId)}`);
  return handle<RatesResponse>(response);
}

export async function runScenario(payload: ScenarioRunRequest): Promise<ScenarioRunResponse> {
  const response = await fetch(`${API_BASE}/api/scenario/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return handle<ScenarioRunResponse>(response);
}
