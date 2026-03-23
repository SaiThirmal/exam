# CyberRange Lite - Educational Cybersecurity Simulator

CyberRange Lite is a special-project-ready cybersecurity simulator built for safe, controlled security practice.
It includes challenge scenarios, attempt scoring, and a live leaderboard so students can learn attack/defense fundamentals in a measurable way.

## Features

- Scenario catalog with difficulty and OWASP-aligned tags
- Detailed challenge views with objective, hints, and safe payload examples
- Attempt submission engine with automated scoring and feedback
- Persistent leaderboard backed by SQLite
- Browser UI for demos and project evaluations
- API and scoring tests with pytest

## Tech Stack

- **Backend:** FastAPI, SQLite
- **Frontend:** HTML, CSS, JavaScript (served by FastAPI)
- **Testing:** pytest + FastAPI TestClient

## Project Structure

```text
.
├── backend
│   ├── app
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── scenarios.py
│   │   └── services
│   │       └── scoring.py
│   ├── requirements.txt
│   └── tests
│       ├── test_api.py
│       └── test_scoring.py
└── frontend
    ├── app.js
    ├── index.html
    └── style.css
```

## Local Setup

From repository root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload
```

Open: `http://127.0.0.1:8000/app`

## Run Tests

```bash
source .venv/bin/activate
pytest backend/tests -q
```

## API Endpoints

- `GET /health` - service health check
- `GET /api/scenarios` - list available scenarios
- `GET /api/scenarios/{scenario_id}` - fetch full scenario details
- `POST /api/attempts` - submit payload + evidence for scoring
- `GET /api/leaderboard` - ranked participants

## Implemented Scenarios

1. **SQL Injection Login Bypass** (Easy)
2. **Reflected XSS in Search** (Medium)
3. **JWT Misconfiguration: alg:none** (Hard)

## Suggested Next Enhancements

- Add Docker + docker-compose for one-command startup
- Add role-based auth (student/instructor/admin)
- Add time-based event mode and team scoreboards
- Integrate actual intentionally-vulnerable microservices for deeper labs
- Add downloadable report/PDF for faculty evaluation

## Important Safety Note

This project is for educational use in controlled environments only.
Do not use these techniques on systems without explicit authorization.
