# NarutoQ

A mobile app where you can ask natural language questions about Naruto lore and get accurate, spoiler-controlled answers — powered by RAG (Retrieval-Augmented Generation).

**Core use case:** *"I'm halfway through Shippuden and forgot how Jiraiya died — tell me without spoiling what comes after."*

---

## How it works

NarutoQ uses a technique called RAG instead of relying on an LLM's memory. Rather than asking the model to recall plot details (which leads to hallucination), we:

1. **Store** — Narutopedia content is split into chunks and stored as semantic vectors in a database
2. **Retrieve** — When you ask a question, we find the most relevant chunks using vector similarity search
3. **Generate** — The LLM reads only those chunks and writes a grounded answer

The spoiler filter is enforced at the retrieval step — chunks beyond your episode boundary are never retrieved, so the LLM physically cannot reference them.

See [docs/rag-pipeline.md](docs/rag-pipeline.md) for a full explanation of how each stage works.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Mobile | React Native (Expo) | Cross-platform iOS + Android |
| Backend | Python + FastAPI | Lightweight, async-ready |
| Vector DB | pgvector (Postgres) | Free, self-hosted, no extra infra |
| Embeddings | fastembed `BAAI/bge-small-en-v1.5` | Fully free, runs locally via ONNX |
| LLM | Groq `llama-3.3-70b-versatile` | 14,400 req/day free, very fast |
| Data pipeline | Python + LangChain text splitter | One-time data ingestion |

See [docs/tech-decisions.md](docs/tech-decisions.md) for the reasoning behind every choice.

---

## Repository Structure

```
narutoq/
├── app/                        # React Native (Expo) mobile app
│   ├── components/
│   │   ├── ArcPicker.tsx       # Arc/episode spoiler boundary selector
│   │   ├── ChatBubble.tsx
│   │   └── SpoilerToggle.tsx
│   └── screens/
│       ├── HomeScreen.tsx
│       ├── ChatScreen.tsx
│       └── SettingsScreen.tsx
│
├── backend/                    # FastAPI backend (deployed to server)
│   ├── main.py
│   ├── routers/query.py        # POST /query endpoint
│   ├── services/
│   │   ├── retriever.py        # pgvector search + spoiler filter
│   │   ├── llm.py              # Groq call + prompt builder
│   │   └── embedder.py         # fastembed wrapper
│   └── models/schema.py
│
├── pipeline/                   # One-time data ingestion (runs locally)
│   ├── fetch_wiki.py           # Pull pages from Narutopedia API
│   ├── chunk.py                # Split pages into tagged chunks
│   ├── embed_and_load.py       # Embed chunks → load into pgvector
│   └── arcs.json               # Arc definitions with episode ranges
│
└── docs/                       # Project documentation
    ├── rag-pipeline.md         # How the RAG system works
    ├── tech-decisions.md       # Why we chose each technology
    └── phases.md               # Build phases and current status
```

---

## Setup

### Prerequisites

- Python 3.11+ (tested on 3.14)
- PostgreSQL 17 with pgvector extension
- Node.js 18+
- A [Groq API key](https://console.groq.com) (free, no credit card)

### 1. Clone and configure

```bash
git clone https://github.com/JieHui-Git/narutoRag
cd narutoRag
cp .env.example .env
# Add your GROQ_API_KEY to .env
```

### 2. Set up the database

```bash
# Install PostgreSQL 17 + pgvector (macOS)
brew install postgresql@17 pgvector
brew services start postgresql@17

# Create database, enable pgvector, and create chunks table
createdb narutoq
psql narutoq -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql narutoq -c "
CREATE TABLE IF NOT EXISTS chunks (
    id SERIAL PRIMARY KEY,
    chunk_id TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384),
    metadata JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS chunks_episode_idx ON chunks ((metadata->>'episode_start'));
"
```

### 3. Run the data pipeline (one-time)

```bash
cd pipeline
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python fetch_wiki.py        # ~30 min — fetches Narutopedia content via API
python chunk.py             # ~1 min  — splits into 12,400+ tagged chunks
python embed_and_load.py    # ~10 min — embeds and loads into pgvector
cd ..
```

### 4. Start the backend

```bash
# From the project root (NarutoApp/)
python3 -m venv backend/.venv && source backend/.venv/bin/activate
pip install -r backend/requirements.txt

# --host 0.0.0.0 required for phone to reach the server on LAN
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 5. Run the mobile app

```bash
cd app
npm install
npx expo start
```

Scan the QR code with [Expo Go](https://expo.dev/go) (iOS or Android). Your phone and laptop must be on the same WiFi network.

> **Note:** Update `API_BASE` in `app/api.ts` to your laptop's LAN IP (e.g. `http://192.168.1.x:8000`) before running on a physical device. Find your IP with `ipconfig getifaddr en0`.

---

## API

### `POST /query`

```json
{
  "question": "How did Jiraiya die?",
  "spoiler_mode": "safe",
  "max_episode": 140
}
```

```json
{
  "answer": "Jiraiya was killed by Pain (Nagato) during their battle in Amegakure...",
  "sources": ["Tale of Jiraiya the Gallant Arc"],
  "spoiler_boundary_hit": false
}
```

`spoiler_mode` options: `"safe"` (filter by episode), `"full"` (no filter), `"custom"` (user picks arcs).

---

## Build Status

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Data pipeline (fetch → chunk → embed → load) | ✅ Complete |
| Phase 2 | FastAPI backend + Groq integration | ✅ Complete |
| Phase 3 | React Native mobile app | ✅ Complete |
| Phase 4 | Polish (onboarding, spoiler UX, streaming, deploy) | 🔄 In progress |

---

## Environment Variables

```
GROQ_API_KEY=        # From console.groq.com
DATABASE_URL=        # postgresql://localhost:5432/narutoq
```
