@echo off
echo ================================================================
echo  AURA 3D: AI-Assisted Immersive Environment Reconstruction
echo ================================================================
echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "AURA 3D Backend" cmd /k "cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Vite React Frontend on http://localhost:5173 ...
start "AURA 3D Frontend" cmd /k "cd frontend && npm.cmd run dev"

echo.
echo Both servers are launching!
echo Open your browser at http://localhost:5173
echo ================================================================
