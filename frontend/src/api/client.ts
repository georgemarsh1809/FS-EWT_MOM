import type { RatesResponse, ScenarioRunRequest, ScenarioRunResponse, ScopeItem } from "../types";
import { useAuthStore } from "../store/auth";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

async function handle<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    useAuthStore.getState().clearToken();
    throw new Error("Unauthorized - please log in again");
  }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return response.json() as Promise<T>;
}

function getAuthHeaders(): HeadersInit {
  const token = useAuthStore.getState().token;
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}

export async function login(password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    throw new Error("Invalid password");
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}

export async function getScopes(): Promise<ScopeItem[]> {
  const response = await fetch(`${API_BASE}/api/rates/scopes`, {
    headers: getAuthHeaders(),
  });
  return handle<ScopeItem[]>(response);
}

export async function getRates(scopeId: string): Promise<RatesResponse> {
  const response = await fetch(`${API_BASE}/api/rates?scope=${encodeURIComponent(scopeId)}`, {
    headers: getAuthHeaders(),
  });
  return handle<RatesResponse>(response);
}

export async function runScenario(payload: ScenarioRunRequest): Promise<ScenarioRunResponse> {
  const response = await fetch(`${API_BASE}/api/scenario/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return handle<ScenarioRunResponse>(response);
}
