# Tennis App

A full-stack application with a FastAPI backend and a Next.js frontend.

## Quick Start (Makefile)

A `Makefile` is provided in the repository root for simple local development:

```bash
# 1. Install all dependencies (backend Python venv + frontend npm packages)
make install

# 2. Start both backend and frontend together
make dev
```

The application will be available at:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://127.0.0.1:8000](http://127.0.0.1:8000) (Docs at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs))

---

## Available Make Commands

| Command | Description |
| :--- | :--- |
| `make help` | Display available targets and descriptions |
| `make dev` | Start both backend and frontend servers concurrently |
| `make backend` | Start FastAPI backend server with auto-reload |
| `make frontend` | Start Next.js frontend dev server |
| `make install` | Install all dependencies (backend + frontend) |
| `make install-backend` | Create virtualenv in `backend/.venv` and install Python requirements |
| `make install-frontend` | Install frontend npm packages via `npm install` |

---

## Manual Setup (Alternative)

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

- **Backend** (`backend/.env` or root `.env`):
  - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase API/anon key

- **Frontend** (`frontend/.env.local` or `frontend/.env`):
  - `NEXT_PUBLIC_API_URL`: Backend API endpoint (defaults to `http://127.0.0.1:8000` if not set)
