# TennisSimulation - local development
#
# Usage:
#   make install   Install backend (pip) and frontend (npm) dependencies
#   make dev       Run backend and frontend together
#   make backend   Run only the FastAPI backend (http://127.0.0.1:8000)
#   make frontend  Run only the Next.js frontend (http://localhost:3000)
#
# First time:
#   1. Add a .env file in the repo root with your Supabase keys (see `make help`).
#   2. Run `make install`, then `make dev`.

.PHONY: help install dev backend frontend

help:
	@echo "TennisSimulation - local development"
	@echo ""
	@echo "Setup (first time):"
	@echo "  1. Create .env in the repo root with:"
	@echo "       NEXT_PUBLIC_SUPABASE_URL"
	@echo "       NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
	@echo "       NEXT_PUBLIC_API_URL=http://127.0.0.1:8000  (optional; default)"
	@echo "  2. make install   Install backend (pip) and frontend (npm) dependencies"
	@echo ""
	@echo "Run:"
	@echo "  make dev          Run backend and frontend together"
	@echo "  make backend      Backend only — http://127.0.0.1:8000"
	@echo "  make frontend     Frontend only — http://localhost:3000"

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

backend:
	cd backend && uvicorn main:app --reload --host 127.0.0.1 --port 8000

frontend:
	cd frontend && npm run dev

# Runs both servers in parallel; Ctrl+C stops them.
dev:
	$(MAKE) -j2 backend frontend
