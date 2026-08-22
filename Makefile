# Local frontend + backend
# Run `make` or `make instructions` to see usage.

.DEFAULT_GOAL := help

.PHONY: help instructions install start backend frontend

help instructions:
	@echo ""
	@echo "  Tennis Simulation — local dev"
	@echo ""
	@echo "  make install      Install frontend (npm) and backend (pip) deps"
	@echo "  make start        Start backend and frontend together"
	@echo "  make backend      Start FastAPI only  → http://127.0.0.1:8000"
	@echo "  make frontend     Start Next.js only  → http://localhost:3000"
	@echo ""
	@echo "  Before first start, create backend/.env with:"
	@echo "    NEXT_PUBLIC_SUPABASE_URL=..."
	@echo "    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=..."
	@echo ""
	@echo "  Then: make install && make start"
	@echo "  Ctrl+C stops both processes."
	@echo ""

install:
	pip install -r backend/requirements.txt
	cd frontend && npm install

backend:
	cd backend && uvicorn main:app --reload --host 127.0.0.1 --port 8000

frontend:
	cd frontend && npm run dev

start:
	@echo "Backend  → http://127.0.0.1:8000"
	@echo "Frontend → http://localhost:3000"
	@echo "Ctrl+C stops both."
	@trap 'kill 0' EXIT; \
		(cd backend && uvicorn main:app --reload --host 127.0.0.1 --port 8000) & \
		(cd frontend && npm run dev) & \
		wait
