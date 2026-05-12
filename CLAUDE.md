# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Does

Pallet Mix Scenario Modeller — a web tool for optimizing pallet volumes across three work types (Consolidation, Groupage, Stock) to maximize overall margin %. The user selects a scope (period average), views unit economics rates, inputs pallet volumes, and optionally runs an optimization to find the best volume mix.

## Commands

### Frontend
```bash
cd frontend
pnpm install         # install dependencies
pnpm dev             # dev server at http://localhost:5173
pnpm build           # production build → dist/
pnpm lint            # ESLint
pnpm preview         # preview production build
```

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000   # dev server
pytest                                       # run all tests
pytest tests/test_calculations.py           # run single test file
```

## Architecture

**Stack:** React 19 + TypeScript + Vite (frontend) / FastAPI + Python (backend) / Zustand (state) / Recharts (charts)

### Data Flow
1. Frontend calls `GET /api/rates?scope=<id>` on scope change → loads fixed unit economics
2. User adjusts pallet volumes (with lock toggles that redistribute to maintain totals)
3. Frontend calls `POST /api/scenario/run` with scope_id + inputs → backend calculates financials
4. Results displayed per work type and as totals

### Frontend Structure
- **`App.tsx`** — monolithic main component handling all UI: scope selector, volume inputs, lock toggles, results display, charts, and the client-side optimization engine
- **`store/useScenarioStore.ts`** — Zustand store owning all app state (scope, rates, inputs, results, optimization state)
- **`api/client.ts`** — thin HTTP client wrapping the three backend endpoints
- **`types.ts`** — TypeScript interfaces that mirror backend Pydantic models (`WorkType`, `RatesResponse`, `ScenarioRunResponse`)
- **`utils/stockConstraint.ts`** — stock flow variance bounds validation (mirrors `backend/app/constraints.py`)
- **`defaults/`** — JSON files with preset scenario defaults (Q1-P10, Q1-P12)

### Backend Structure
- **`app/main.py`** — three endpoints: `GET /api/rates/scopes`, `GET /api/rates`, `POST /api/scenario/run`
- **`app/calculations.py`** — core per-type revenue/cost/margin computation
- **`app/rates.py`** — loads `data/rates.json`, provides scope lookups
- **`app/models.py`** — Pydantic request/response schemas
- **`app/constraints.py`** — stock flow variance bounds validation
- **`app/config.py`** — constants (YTD volumes: 206,433 in / 206,241 out)
- **`data/rates.json`** — reference data: scopes mapped to unit economics rates

### Key Domain Rules
- Unit economics (rates) are **fixed per scope** — only volumes change the financial outcome
- Stock work type has a **flow constraint**: pallets_out variance from pallets_in is bounded (validated in both frontend and backend)
- Lock toggles: locking a work type's volume causes adjustments to redistribute across unlocked types when totals change
- Optimization runs client-side in the Zustand store, iterating over volume combinations to maximise margin %

## Deployment

Backend is containerised (see `Dockerfile`) and deployed to Fly.io (`fly.toml`). CORS origins are environment-configured in `main.py`.
