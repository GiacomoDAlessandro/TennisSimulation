# Simple Makefile to run local frontend and backend

.PHONY: help install install-backend install-frontend backend frontend dev

ROOT_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
PYTHON ?= python3
VENV ?= $(ROOT_DIR)/backend/.venv
VENV_PYTHON = $(VENV)/bin/python
VENV_UVICORN = $(VENV)/bin/uvicorn

help: ## Show available commands and instructions
	@echo "Available commands:"
	@echo "  make dev               Start both frontend and backend concurrently"
	@echo "  make backend           Start FastAPI backend (http://127.0.0.1:8000)"
	@echo "  make frontend          Start Next.js frontend (http://localhost:3000)"
	@echo "  make install           Install all backend and frontend dependencies"
	@echo "  make install-backend   Create virtualenv and install Python packages"
	@echo "  make install-frontend  Install frontend npm packages"
	@echo "  make help              Show this help menu"

$(VENV)/bin/activate:
	$(PYTHON) -m venv $(VENV)

install-backend: $(VENV)/bin/activate ## Install backend Python dependencies into backend/.venv
	$(VENV_PYTHON) -m pip install --upgrade pip
	$(VENV_PYTHON) -m pip install -r $(ROOT_DIR)/backend/requirements.txt

install-frontend: ## Install frontend npm dependencies
	cd $(ROOT_DIR)/frontend && npm install

install: install-backend install-frontend ## Install both backend and frontend dependencies

backend: ## Run backend server with auto-reload (requires install-backend)
	@if [ ! -f $(VENV_UVICORN) ]; then \
		echo "Virtualenv or uvicorn not found. Running make install-backend first..."; \
		$(MAKE) -C $(ROOT_DIR) install-backend; \
	fi
	cd $(ROOT_DIR)/backend && $(VENV_UVICORN) main:app --reload --host 127.0.0.1 --port 8000

frontend: ## Run frontend dev server (requires install-frontend)
	@if [ ! -d $(ROOT_DIR)/frontend/node_modules ]; then \
		echo "frontend/node_modules not found. Running make install-frontend first..."; \
		$(MAKE) -C $(ROOT_DIR) install-frontend; \
	fi
	cd $(ROOT_DIR)/frontend && npm run dev

dev: ## Start backend and frontend concurrently
	@echo "Starting backend and frontend..."
	@trap 'kill 0' INT TERM EXIT; \
	$(MAKE) -C $(ROOT_DIR) backend & \
	$(MAKE) -C $(ROOT_DIR) frontend & \
	wait

