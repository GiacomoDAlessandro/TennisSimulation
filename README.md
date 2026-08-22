# TennisSimulation

A FastAPI backend (`backend/`) serving tennis match and serve data from Supabase, and a Next.js frontend (`frontend/`) that visualizes it.

## Requirements

- Python 3.10+
- Node.js 20+ (npm)
- `make`

## Setup

1. Install dependencies. This creates a virtualenv at `backend/.venv` and runs `npm install` in `frontend/`:

```bash
make install
```

2. Create `backend/.env` with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

The frontend defaults to `http://127.0.0.1:8000` for the API, so no frontend env file is needed for local development. To point it elsewhere, set `NEXT_PUBLIC_API_URL` in `frontend/.env.local`.

## Running locally

```bash
make dev
```

- Backend: http://127.0.0.1:8000 (docs at http://127.0.0.1:8000/docs)
- Frontend: http://localhost:3000

Ctrl+C stops both.

## Make targets

| Command | Description |
| --- | --- |
| `make help` | List the available targets |
| `make install` | Install backend (venv) and frontend (npm) dependencies |
| `make dev` | Run backend and frontend together |
| `make backend` | Run only the FastAPI backend |
| `make frontend` | Run only the Next.js frontend |
| `make clean` | Delete `backend/.venv` and `frontend/node_modules` |
