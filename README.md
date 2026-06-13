# NeonNet

**NeonNet** is a local-only cyberpunk dashboard for mapping public internet trend signals from Hacker News and Reddit.

It collects public posts, extracts simple deterministic keywords, builds a co-occurrence graph, and stores optional trend snapshots in SQLite so you can inspect momentum over time. Everything runs on your machine.

```text
Local-only · HN + Reddit · SQLite history · No AI · No cloud
```

## 🖼️ Screenshots

<img width="1888" height="855" alt="Image" src="https://github.com/user-attachments/assets/91881dbe-ca1e-4ecd-aa1c-a9aed51191ab" />

<img width="1881" height="836" alt="Image" src="https://github.com/user-attachments/assets/97fd8379-fcf8-45e3-904a-598c829af6fe" />

<img width="1901" height="864" alt="Image" src="https://github.com/user-attachments/assets/43f5d654-3357-41d7-95d6-e4649e5d9f31" />

---

## What It Does

- Fetches public Hacker News top stories.
- Fetches public Reddit hot posts from selected subreddits.
- Extracts keywords from post titles using simple local rules.
- Builds trend cards, co-occurrence edges, and an interactive Sigma graph.
- Saves local snapshots to SQLite when you click **Collect Snapshot**.
- Shows trend history and velocity: rising, falling, stable, or new.

## What It Does Not Do

- No AI or local LLM.
- No OpenAI API.
- No paid APIs.
- No cloud services.
- No authentication.
- No WebSocket or background worker yet.
- No Docker setup yet.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, TypeScript, TailwindCSS |
| Graph UI | Sigma.js, Graphology, `@react-sigma/core` |
| Backend | FastAPI, Python |
| HTTP client | httpx |
| Persistence | SQLite via Python `sqlite3` |
| Data sources | Hacker News Firebase API, Reddit public JSON listings |

## Project Structure

```text
neonnet/
  apps/
    web/                  # Next.js dashboard
      app/
        components/       # Dashboard panels and graph UI
        api/              # Next.js proxy routes to FastAPI
        page.tsx          # Dashboard orchestration
        types.ts          # Shared frontend types
    api/                  # FastAPI backend
      app/
        collectors/       # Hacker News and Reddit collectors
        graph/            # Graph builder
        trends/           # Keyword extraction and trend engine
        db.py             # SQLite connection and schema setup
        persistence.py    # Snapshot/history persistence
        main.py           # API routes
  README.md
  .gitignore
  .env.example
```

## Quick Start

### 1. Start the Backend

```bash
cd neonnet/apps/api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

On macOS/Linux, activate the virtual environment with:

```bash
source .venv/bin/activate
```

The backend runs at:

```text
http://localhost:8000
```

### 2. Start the Frontend

Open a second terminal:

```bash
cd neonnet/apps/web
copy .env.local.example .env.local
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:3000
```

### 3. Open the Dashboard

Open:

```text
http://localhost:3000
```

Wait for the graph to load, or click **Refresh**.

## Demo Flow

1. Start the backend.
2. Start the frontend.
3. Open `http://localhost:3000`.
4. Wait for the HN + Reddit graph to appear.
5. Click **Collect Snapshot**.
6. Wait 60 seconds or click **Refresh**.
7. Click **Collect Snapshot** again.
8. Inspect **Trend Momentum** to see rising, falling, stable, and new keywords.
9. Click keyword cards to filter local trend history.

## Environment

Frontend environment file:

```text
neonnet/apps/web/.env.local
```

Example:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

SQLite database path defaults to `neonnet.db` in the backend working directory.

Override it with:

```text
NEONNET_DB_PATH=C:\path\to\neonnet.db
```

## API Reference

### Health

```text
GET /health
```

```json
{
  "status": "ok",
  "service": "neonnet-api"
}
```

### Hacker News Top Stories

```text
GET /api/hn/top
```

Returns normalized Hacker News stories.

```json
[
  {
    "source": "hn",
    "id": "123456",
    "title": "Story title",
    "url": "https://example.com",
    "score": 120,
    "comments": 34,
    "created_at": "2026-01-01T12:00:00Z"
  }
]
```

### Reddit Hot Posts

```text
GET /api/reddit/hot
```

Returns normalized Reddit posts from public JSON listing endpoints.

```json
[
  {
    "source": "reddit",
    "id": "abc123",
    "title": "Post title",
    "url": "https://reddit.com/r/technology/comments/abc123/post_title/",
    "score": 120,
    "comments": 34,
    "created_at": "2026-01-01T12:00:00Z",
    "subreddit": "technology"
  }
]
```

### Trends

```text
GET /api/trends
```

Combines Hacker News and Reddit titles, extracts keywords, and returns simple heat scores.

```json
{
  "source": "multi",
  "sources": ["hn", "reddit"],
  "count": 30,
  "trends": [
    {
      "keyword": "rust",
      "mentions": 6,
      "heat": 60,
      "sources": ["hn", "reddit"]
    }
  ]
}
```

### Graph

```text
GET /api/graph
```

Builds keyword nodes and co-occurrence edges for the dashboard graph.

```json
{
  "source": "multi",
  "sources": ["hn", "reddit"],
  "nodes_count": 30,
  "edges_count": 12,
  "nodes": [
    {
      "id": "rust",
      "label": "rust",
      "type": "keyword",
      "source": "multi",
      "sources": ["hn", "reddit"],
      "mentions": 6,
      "heat": 60,
      "size": 24
    }
  ],
  "edges": [
    {
      "id": "async-rust",
      "source": "async",
      "target": "rust",
      "weight": 2
    }
  ]
}
```

### Collect Snapshot

```text
POST /api/collect
```

Fetches current public posts, saves new posts to SQLite, computes current trends, and saves trend snapshots.

```json
{
  "saved_posts": 123,
  "saved_trends": 30,
  "db_path": "C:\\path\\to\\neonnet.db"
}
```

### Trend History

```text
GET /api/history/trends
GET /api/history/trends?keyword=rust&limit=25
```

Returns recent rows from local `trend_snapshots`.

### Trend Velocity

```text
GET /api/history/velocity
GET /api/history/velocity?limit=30
```

Compares each keyword's latest heat against its previous saved snapshot.

```json
{
  "count": 30,
  "items": [
    {
      "keyword": "rust",
      "latest_heat": 80,
      "previous_heat": 40,
      "velocity": 40,
      "status": "rising",
      "sources": ["hn", "reddit"],
      "latest_at": "2026-01-01T12:00:00Z"
    }
  ]
}
```

## Data Sources

### Hacker News

Uses the free public Hacker News Firebase API:

```text
https://hacker-news.firebaseio.com/v0/topstories.json
https://hacker-news.firebaseio.com/v0/item/{id}.json
```

### Reddit

Uses public Reddit JSON listing endpoints without OAuth:

```text
https://www.reddit.com/r/{subreddit}/hot.json?limit=25
```

Configured subreddits:

- `technology`
- `programming`
- `worldnews`
- `science`
- `cybersecurity`
- `artificial`
- `MachineLearning`

Reddit requests send this User-Agent:

```text
NeonNetLocal/0.1
```

## How Trend Logic Works

Keyword extraction is intentionally simple and deterministic:

1. Lowercase titles.
2. Remove punctuation.
3. Split titles into words.
4. Remove common English stopwords.
5. Ignore words shorter than 3 characters.
6. Count keyword frequency.

Trend heat is currently:

```text
heat = mentions * 10
```

Graph edges are created when two top keywords appear in the same title.

## Local Persistence

SQLite tables are created automatically on backend startup.

### `posts`

Stores normalized HN and Reddit posts.

### `trend_snapshots`

Stores keyword, mention count, heat, sources, and timestamp for local trend history.

Persistence is optional. Live `/api/trends` and `/api/graph` still work directly from collectors without using the database.

## Development Notes

Useful checks:

```bash
cd neonnet/apps/api
python -m py_compile app/main.py app/persistence.py app/db.py app/collectors/hacker_news.py app/collectors/reddit.py app/collectors/sources.py app/graph/graph_builder.py app/trends/keyword_extractor.py app/trends/trend_engine.py
```

```bash
cd neonnet/apps/web
npm run build
```

Local generated files are ignored, including:

- `.env.local`
- `.venv/`
- `node_modules/`
- `.next/`
- `neonnet.db`
- `*.db`

## Current MVP Status

NeonNet is a working local MVP. It is ready for demoing the core loop:

```text
Fetch public posts -> build graph -> collect snapshot -> inspect history and velocity
```

The next natural improvements would be charting, better graph layout controls, scheduled local collection, and more data sources, but those are intentionally outside the current MVP.
