# Tennis Visualizer

Web app for exploring ATP match-charting data: serve locations on a court, and a player improvement timeline (serve points won, holds, times broken).

Point strings come from Jeff Sackmann’s [Tennis Abstract Match Charting Project](https://github.com/JeffSackmann/tennis_MatchChartingProject). Matches and points live in **Supabase**; a **FastAPI** backend queries them; a **Next.js** frontend draws the court and charts.

**For coding agents (Codex, Cursor, etc.):** read [`AGENTS.md`](AGENTS.md) first — full repo map, database tables, API contracts, frontend data flow, change patterns, and **how to decode raw charting `1st`/`2nd` strings**.

## What you can do

- **View ATP Matches** (`/matchsimulator`): pick one or two players, surface, and matches. Serves are plotted on a tennis court (scatter or heatmap) with filters for outcome and pressure.
- **Point replay**: for one selected match, step through points on a court diagram and review each point’s score, serve, rally, and result.
- **Progress** (`/progress`): pick a player and load a timeline of match-level serve rates, optional trend line, and optional period comparison.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js (App Router), React, Tailwind |
| Court | Konva / react-konva, simpleheat |
| API | FastAPI, uvicorn |
| Data | Supabase (Postgres) |

## Configure a local copy

**Need:** Python 3.11+, Node.js 20+, a Supabase project whose `matches` and `points` tables match this repo’s loaders ([`backend/loadData.py`](backend/loadData.py)).

1. Clone the repo and install:

```bash
make install
```

That creates `.venv`, installs [`backend/requirements.txt`](backend/requirements.txt), and runs `npm install` in `frontend/`.

2. Create [`backend/.env`](backend/.env) (this path is gitignored):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key
```

The backend reads those names in [`backend/db.py`](backend/db.py). Use a key that can `select` on `matches`, `points`, and `players`.

3. Optional frontend override — `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

If this is unset, the UI defaults to `http://127.0.0.1:8000` ([`frontend/src/lib/api.js`](frontend/src/lib/api.js)). For a deployed UI talking to a hosted API, set this to that API origin (no trailing slash).

4. Optional backend tunables (same `backend/.env`):

```dotenv
SUPABASE_EXECUTOR_WORKERS=8
SUPABASE_MAX_INFLIGHT=8
CACHE_ADMIN_SECRET=
```

5. Run both processes:

```bash
make dev
```

- App: [http://localhost:3000](http://localhost:3000)
- API: [http://127.0.0.1:8000](http://127.0.0.1:8000) (try `/docs`)

`Ctrl+C` stops both. `make frontend` or `make backend` runs one side only.

### Loading charting CSVs (optional)

If you maintain the database yourself, CSVs typically live under `Data/` and are upserted with:

```bash
cd backend && ../.venv/bin/python loadData.py
```

You need tables that match the upserts in `loadData.py` (`matches`, `points`, `players`, including `winner` and `game_number` on points). The dashboard error about `supabase_migrations.schema_migrations` is unrelated to the app; it only matters if you use the Supabase CLI for migrations. SQL to create that metadata table is in [`backend/sql/create_supabase_schema_migrations.sql`](backend/sql/create_supabase_schema_migrations.sql).

### Production notes

- Host the API (e.g. Render) with `workers=1` if you rely on the process-local cache in [`backend/main.py`](backend/main.py).
- Career-wide serve fetches should send **chunks of `match_ids`**; a single `/getPlayerServesBulk/{name}` for a deep career often exceeds host timeouts (~30s) and can surface in the browser as a CORS failure even when CORS is `allow_origins=["*"]`.
- Bulk point rows must include `game_number` or the progress timeline will drop every match (holds/breaks cannot be grouped).

## License / data

Match Charting Project data is CC BY-NC-SA 4.0. Respect that license if you redistribute charts or dumps.
