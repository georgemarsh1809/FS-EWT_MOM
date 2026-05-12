import { create } from "zustand";
import { useAuthStore } from "./auth";

// Type inferred from the defaults JSON structure
export type DefaultsData = Record<string, string | number>;

export type DefaultsState = {
  defaults: {
    p10: DefaultsData | null;
    p12: DefaultsData | null;
  };
  loading: boolean;
  error: string | null;
  loadDefaults: (preset: "p10" | "p12") => Promise<void>;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export const useDefaultsStore = create<DefaultsState>((set, get) => ({
  defaults: {
    p10: null,
    p12: null,
  },
  loading: false,
  error: null,
  loadDefaults: async (preset: "p10" | "p12") => {
    const { defaults } = get();

    // No-op if already loaded
    if (defaults[preset] !== null) {
      return;
    }

    const token = useAuthStore.getState().token;
    if (!token) {
      set({ error: "Not authenticated", loading: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/defaults/${preset}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load defaults: ${response.statusText}`);
      }

      const data = (await response.json()) as DefaultsData;
      set({
        defaults: { ...defaults, [preset]: data },
        loading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load defaults";
      set({ error: message, loading: false });
      throw error;
    }
  },
}));
