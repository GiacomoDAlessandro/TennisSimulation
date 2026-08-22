# Local development — run `make` or `make help` for usage.
#
# Prerequisites:
#   - Node.js + npm
#   - Python 3
#   - A `.env` file in `backend/` with:
#       NEXT_PUBLIC_SUPABASE_URL=...
#       NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
#
# Frontend: http://localhost:3000
# Backend:  http://127.0.0.1:8000

.PHONY: help install backend frontend start

help:
	@echo "Tennis app — local commands"
	@echo ""
	@echo "  make install    Install frontend and backend dependencies"
	@echo "  make start      Start frontend + backend together"
	@echo "  make frontend   Start Next.js only (port 3000)"
	@echo "  make backend    Start FastAPI only (port 8000)"
	@echo "  make help       Show this message"
	@echo ""
	@echo "First time: put Supabase keys in backend/.env, then:"
	@echo "  make install && make start"

install:
	cd frontend && npm install
	cd backend && python3 -m pip install -r requirements.txt

backend:
	cd backend && python3 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

frontend:
	cd frontend && npm run dev

start:
	@$(MAKE) -j2 backend frontend
