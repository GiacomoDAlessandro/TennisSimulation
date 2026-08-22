# TennisSimulation - local development
#
# Usage:
#   make install   Install backend and frontend dependencies
#   make dev       Run backend and frontend together
#   make backend   Run only the FastAPI backend (http://127.0.0.1:8000)
#   make frontend  Run only the Next.js frontend (http://localhost:3000)
#
# First time:
#   1. Add your Supabase keys to backend/.env (see `make help`).
#   2. Run `make install`, then `make dev`.

PYTHON := .venv/bin/python

.PHONY: help install dev backend frontend

help:
	@echo "TennisSimulation - local development"
	@echo ""
	@echo "Setup (first time):"
	@echo "  1. Create backend/.env with:"
	@echo "       NEXT_PUBLIC_SUPABASE_URL"
	@echo "       NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
	@echo "  2. make install   Install backend and frontend dependencies"
	@echo ""
	@echo "Run:"
	@echo "  make dev          Run backend and frontend together"
	@echo "  make backend      Backend only — http://127.0.0.1:8000"
	@echo "  make frontend     Frontend only — http://localhost:3000"

install:
	npm --prefix frontend install
	python3 -m venv .venv
	$(PYTHON) -m pip install -r backend/requirements.txt

backend:
	cd backend && ../$(PYTHON) -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

frontend:
	npm --prefix frontend run dev

# Runs both servers in parallel; Ctrl+C stops them.
dev:
	@$(MAKE) --no-print-directory -j2 frontend backend
