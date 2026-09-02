# LedgerLens AI

Autonomous financial reconciliation with AI-powered exception investigation. Built for the **Razorpay Buildathon — Track 4: AI Finance Controller**.

It strictly separates **deterministic matching** (exact/tolerance/refund/duplicate detection with 100% mathematical accuracy) from **AI exception investigation** (confidence-scored analysis that auto-resolves safe cases and escalates uncertain ones for human review).

---

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy
- **Database:** PostgreSQL (Neon) — SQLite fallback for local dev
- **AI Providers:** Groq, OpenAI, Gemini, or built-in Mock

---

## Local Development

```bash
# 1. Backend deps
make setup

# 2. Start API (port 8000)
make run-api

# 3. Start web dashboard (port 3000)
make run-web
```

Other commands:

```bash
make generate-data   # generate 500-record synthetic dataset
make test            # run pytest suite
make run-eval        # run evaluation suite
```

Set env vars in `.env` (see `.env.example`): `DATABASE_URL`, `AI_PROVIDER`, and your AI provider keys.

---

## Deployment

- **Database:** Neon Postgres (free). Set `DATABASE_URL` in the API's environment.
- **API:** Render (Docker, root dir `apps/api`, port `$PORT`).
- **Web:** Vercel (root dir `apps/web`, env `NEXT_PUBLIC_API_URL` pointing to the deployed API).

The API auto-creates its tables on first startup. The web app proxies `/api/*` to the backend via `NEXT_PUBLIC_API_URL`.
