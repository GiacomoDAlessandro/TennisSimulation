# Local development

Install the frontend and backend dependencies:

```bash
make install
```

Add the Supabase values used by the backend to `backend/.env`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Start both development servers:

```bash
make dev
```

The frontend runs at http://localhost:3000 and the backend at http://127.0.0.1:8000. Press `Ctrl+C` to stop both.

To run one server by itself, use `make frontend` or `make backend`.
