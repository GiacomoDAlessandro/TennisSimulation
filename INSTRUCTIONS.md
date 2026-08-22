# Local development

Simple Makefile targets to run the app on your machine.

## Setup

1. Put Supabase credentials in `backend/.env`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

2. Install dependencies:

```bash
make install
```

## Run

Start both servers:

```bash
make start
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://127.0.0.1:8000](http://127.0.0.1:8000)

Or run them separately:

```bash
make frontend
make backend
```

See all commands with `make` or `make help`.
