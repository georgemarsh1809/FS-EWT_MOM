# Pallet Mix Scenario Modeller (V1)

Mini web app for modelling pallet mix scenarios across Consolidation, Groupage, and Stock work types.

## Repo structure
- `backend/` FastAPI API for rates + scenario calculation
- `frontend/` React + Vite UI

## Backend setup (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### API endpoints
- `GET /api/rates/scopes`
- `GET /api/rates?scope=<scope_id>`
- `POST /api/scenario/run`

### Run tests
```bash
cd backend
source venv/bin/activate
pytest
```

## Frontend setup (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and expects the API at `http://localhost:8000`.

## Notes
- Per-pallet unit economics are fixed per scope. Volume changes only affect totals.
- Lock toggles keep total IN or OUT constant by rebalancing the other two work types.
