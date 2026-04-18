# HireX — AI-Powered Recruitment Platform

HireX is a full-stack recruitment platform that uses local AI to score resumes, screen candidates in bulk, schedule interviews, and generate interview questions and cover letters — all without any paid API.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, React Router, Axios |
| Backend | Python, FastAPI, SQLAlchemy 2.0 |
| Database | PostgreSQL |
| AI | Ollama (phi3 + nomic-embed-text) — runs locally |
| Auth | JWT + bcrypt |

---

## Features

- **Job Listings** — HR posts jobs, candidates browse and apply with resume upload
- **AI Resume Scoring** — automatically scores each application against the job description
- **Bulk Resume Screening** — upload multiple resumes at once and get a ranked results table
- **Interview Scheduling** — HR sets date, time and meeting link; candidate gets an email automatically
- **AI Interview Questions** — generates tailored questions based on the candidate's resume vs the job
- **AI Cover Letter** — generates a personalised cover letter for the candidate
- **Role-Based Access** — separate dashboards for HR and Candidate

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL
- [Ollama](https://ollama.com/) installed and running

### Pull the required AI models

```bash
ollama pull phi3
ollama pull nomic-embed-text
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Create a `.env` file in `/backend`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/hirex
JWT_SECRET_KEY=your-secret-key
EMAIL_ADDRESS=your@gmail.com
EMAIL_PASSWORD=your-app-password
```

```bash
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`  
API docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## Project Structure

```
HireX/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers (auth, jobs, hr)
│   │   ├── models/       # SQLAlchemy models
│   │   ├── services/     # AI logic (scorer, extractor, questions)
│   │   └── main.py
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/        # HR and Candidate pages
        ├── layouts/      # HR and Candidate layouts
        └── api/          # Axios instance
```

---

## How AI Scoring Works

1. Resume text extracted from PDF / DOCX
2. `phi3` LLM extracts skills, experience and education from both resume and job description
3. `nomic-embed-text` embeds all skills and computes cosine similarity
4. Final score = **Skills 80%** + Experience 15% + Education 5%
5. Skill gap returned as matched / partial / missing lists

---

## License

MIT
