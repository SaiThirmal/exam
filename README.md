# CyberRange Lite - Educational Cybersecurity Simulator

CyberRange Lite is a special-project-ready cybersecurity simulator built for safe, controlled security practice.
It includes challenge scenarios, authenticated practice, team mode, scoring analytics, and live leaderboards so students can learn attack/defense fundamentals in a measurable way.

## Features

- Scenario catalog with difficulty and OWASP-aligned tags
- Detailed challenge views with objective, hints, and safe payload examples
- Role-based authentication (`student`, `instructor`, `admin`)
- Team mode with invite codes and team-scoped attempt submissions
- Attempt submission engine with automated scoring and feedback
- Individual and team leaderboards
- User progress dashboard (overall + per scenario metrics)
- Persistent storage backed by SQLite
- Browser UI for project demos and evaluations
- Dockerized startup for one-command local run
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
│   │       ├── auth.py
│   │       └── scoring.py
│   ├── requirements.txt
│   └── tests
│       ├── test_api.py
│       └── test_scoring.py
├── docker-compose.yml
├── Dockerfile
└── frontend
    ├── auth.html
    ├── leaderboard.html
    ├── missions.html
    ├── progress.html
    ├── teams.html
    ├── index.html
    ├── js
    │   ├── core.js
    │   ├── home.js
    │   ├── auth.js
    │   ├── teams.js
    │   ├── missions.js
    │   ├── leaderboard.js
    │   └── progress.js
    └── style.css
```

## Default Accounts

These accounts are auto-created at app startup:

- **admin** / `admin12345`
- **instructor** / `instructor123`

You can also self-register student/instructor users from the UI.

## Local Setup

From repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r backend/requirements.txt
python3 -m uvicorn backend.app.main:app --reload
```

Open: `http://127.0.0.1:8000/app`

## Docker Setup

```bash
docker compose up --build
```

Open: `http://127.0.0.1:8000/app`

## Run Tests

```bash
source .venv/bin/activate
python3 -m pytest backend/tests -q
```

## API Endpoints

- `GET /health` - service health check
- `POST /api/auth/register` - create account and get access token
- `POST /api/auth/login` - login and get access token
- `POST /api/auth/logout` - revoke current access token
- `GET /api/auth/me` - current authenticated user
- `GET /api/admin/users` - list users (admin only)
- `GET /api/scenarios` - list available scenarios
- `GET /api/scenarios/{scenario_id}` - fetch full scenario details
- `POST /api/teams` - create a team
- `POST /api/teams/join` - join a team using invite code
- `GET /api/teams/mine` - list teams for current user
- `POST /api/attempts` - submit payload + evidence for scoring (authenticated)
- `GET /api/leaderboard` - ranked participants
- `GET /api/leaderboard/teams` - ranked teams
- `GET /api/progress/me` - user progress summary

## Implemented Scenarios

1. **SQL Injection Login Bypass** (Easy)
2. **Reflected XSS in Search** (Medium)
3. **JWT Misconfiguration: alg:none** (Hard)
4. **Path Traversal in File Download** (Medium)
5. **Command Injection in Ping Utility** (Hard)

## Important Safety Note

This project is for educational use in controlled environments only.
Do not use these techniques on systems without explicit authorization.
