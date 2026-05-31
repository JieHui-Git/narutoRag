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

- Python 3.11+
- PostgreSQL 17 with pgvector extension
- Node.js 18+ (for the mobile app)
- A [Groq API key](https://console.groq.com) (free)

### 1. Clone and configure

```bash
git clone https://github.com/JieHui-Git/narutoRag
cd narutoRag
cp .env.example .env
# Add your GROQ_API_KEY to .env
```

### 2. Set up the database

```bash
# Install pgvector (macOS)
brew install postgresql@17 pgvector
brew services start postgresql@17

# Create database and enable pgvector
createdb narutoq
psql narutoq -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Create the chunks table
psql narutoq -f pipeline/schema.sql
```

### 3. Run the data pipeline (one-time)

```bash
cd pipeline
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python fetch_wiki.py        # ~20 min, fetches Narutopedia content
python chunk.py             # ~1 min, splits into 12,000+ tagged chunks
python embed_and_load.py    # ~10 min, embeds and loads into pgvector
```

### 4. Start the backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 5. Run the mobile app

```bash
cd app
npm install
npx expo start
```

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
| Phase 2 | FastAPI backend + Groq integration | 🔄 In progress |
| Phase 3 | React Native mobile app | ⏳ Pending |
| Phase 4 | Polish (streaming, onboarding, error states) | ⏳ Pending |

---

## Environment Variables

```
GROQ_API_KEY=        # From console.groq.com
DATABASE_URL=        # postgresql://localhost:5432/narutoq
```
