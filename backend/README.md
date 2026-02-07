# HireX Backend

## Prerequisites
- Python 3.11+
- uv installed (`pip install uv`)

## Setup
1. Create a virtual environment in `backend`:
   - `python -m venv .venv`
2. Activate the virtual environment (PowerShell):
   - `.\.venv\Scripts\Activate.ps1`
3. Install dependencies with uv:
   - `uv sync`

## VS Code Interpreter
- In VS Code, select the interpreter at `backend\.venv\Scripts\python.exe`.

## Run the API
- `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`

## Environment
- Copy `.env.example` to `.env` and replace placeholders.
