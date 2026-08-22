# Tennis Simulation

Local frontend (Next.js) and backend (FastAPI).

## Run locally

1. Create `backend/.env` with your Supabase credentials:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```

2. Install dependencies and start both services:

   ```bash
   make install
   make start
   ```

- Frontend: http://localhost:3000
- Backend: http://127.0.0.1:8000

Run `make` or `make instructions` to list all targets. `Ctrl+C` stops both processes.

You can also start each service on its own with `make backend` or `make frontend`.
