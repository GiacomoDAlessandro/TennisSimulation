# TennisSimulation - local development
#
#   make install   Install backend (venv) and frontend (npm) dependencies
#   make dev       Run backend and frontend together
#   make backend   Run only the FastAPI backend (http://127.0.0.1:8000)
#   make frontend  Run only the Next.js frontend (http://localhost:3000)
#   make clean     Delete the backend venv and frontend node_modules
#
# First time: run `make install`, then `make dev`.

VENV := backend/.venv
PYTHON ?= python3
BIN := $(CURDIR)/$(VENV)/bin

.PHONY: help install dev backend frontend clean

help:
	@echo "TennisSimulation - local development"
	@echo ""
	@echo "  make install   Install backend (venv) and frontend (npm) dependencies"
	@echo "  make dev       Run backend and frontend together"
	@echo "  make backend   Run only the FastAPI backend (http://127.0.0.1:8000)"
	@echo "  make frontend  Run only the Next.js frontend (http://localhost:3000)"
	@echo "  make clean     Delete the backend venv and frontend node_modules"
	@echo ""
	@echo "First time: run 'make install', then 'make dev'."

install:
	$(PYTHON) -m venv $(VENV)
	$(BIN)/pip install -r backend/requirements.txt
	cd frontend && npm install

backend:
	@test -x $(BIN)/uvicorn || { echo "Backend deps missing - run 'make install' first."; exit 1; }
	cd backend && $(BIN)/uvicorn main:app --reload

frontend:
	@test -d frontend/node_modules || { echo "Frontend deps missing - run 'make install' first."; exit 1; }
	cd frontend && npm run dev

# Runs both servers in parallel; Ctrl+C stops them.
dev:
	$(MAKE) -j2 backend frontend

clean:
	rm -rf $(VENV) frontend/node_modules
