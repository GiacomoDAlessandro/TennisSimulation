# TennisSimulation - local development
#
# Usage:
#   make install   Install backend (pip) and frontend (npm) dependencies
#   make dev       Run backend and frontend together
#   make backend   Run only the FastAPI backend (http://127.0.0.1:8000)
#   make frontend  Run only the Next.js frontend (http://localhost:3000)
#
# First time: run `make install`, then `make dev`.

.PHONY: help install dev backend frontend

help:
	@echo "TennisSimulation - local development"
	@echo ""
	@echo "  make install   Install backend (pip) and frontend (npm) dependencies"
	@echo "  make dev       Run backend and frontend together"
	@echo "  make backend   Run only the FastAPI backend (http://127.0.0.1:8000)"
	@echo "  make frontend  Run only the Next.js frontend (http://localhost:3000)"
	@echo ""
	@echo "First time: run 'make install', then 'make dev'."

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

backend:
	cd backend && uvicorn main:app --reload

frontend:
	cd frontend && npm run dev

# Runs both servers in parallel; Ctrl+C stops them.
dev:
	$(MAKE) -j2 backend frontend
