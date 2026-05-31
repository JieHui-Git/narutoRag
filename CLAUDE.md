# NarutoQ — Project Brief

## What We're Building

A mobile app where users can ask natural language questions about Naruto lore and get accurate, spoiler-controlled answers powered by RAG (Retrieval-Augmented Generation).

Core use case: "I'm in the middle of Naruto Shippuden and I forgot how Jiraiya died — tell me without spoiling what comes after."

---

## Tech Stack

| Layer | Choice |
|---|---|
| Mobile | React Native (Expo) |
| Backend | Python + FastAPI |
| Vector DB | pgvector (Postgres extension) |
| Embeddings | fastembed — `BAAI/bge-small-en-v1.5` (local, free) |
| LLM | Groq — `llama-3.3-70b-versatile` (14,400 req/day free) |
| Data pipeline | Python scraper + LangChain text splitter |
| Auth | Clerk (or skip for MVP) |

---

## Repository Structure

```
narutoq/
├── app/                        # React Native (Expo) mobile app
│   ├── components/
│   │   ├── ArcPicker.tsx       # Arc/episode spoiler boundary selector
│   │   ├── ChatBubble.tsx
│   │   └── SpoilerToggle.tsx   # Safe / Full Series / Custom modes
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   └── SettingsScreen.tsx
│   └── App.tsx
│
├── backend/                    # FastAPI backend
│   ├── main.py                 # FastAPI app entrypoint
│   ├── routers/
│   │   └── query.py            # POST /query endpoint
│   ├── services/
│   │   ├── retriever.py        # pgvector similarity search + spoiler filter
│   │   ├── llm.py              # Groq call + prompt builder
│   │   └── embedder.py         # OpenAI embedding wrapper
│   ├── models/
│   │   └── schema.py           # Pydantic models
│   └── db.py                   # Postgres/pgvector connection
│
├── pipeline/                   # One-time data ingestion
│   ├── fetch_wiki.py           # Fetch pages from Narutopedia MediaWiki API
│   ├── chunk.py                # Split docs into chunks with metadata
│   ├── embed_and_load.py       # Embed chunks → insert into pgvector
│   └── arcs.json               # Arc definitions with episode ranges
│
└── CLAUDE.md                   # This file
```

---

## Data Pipeline (Run Once Before App Dev)

### Source
Narutopedia MediaWiki API — fetch pages by category without downloading an XML dump.

Fetch categories:
- Story arcs
- Main characters
- Major jutsu
- Organizations (Akatsuki, etc.)

### Chunk Metadata Schema
Every chunk stored in pgvector must have this metadata:

```json
{
  "content": "...",
  "metadata": {
    "arc": "Tale of Jiraiya the Gallant",
    "arc_id": "jiraiya_arc",
    "episode_start": 133,
    "episode_end": 152,
    "manga_chapter_start": 367,
    "manga_chapter_end": 383,
    "part": "shippuden",
    "source_page": "Jiraiya",
    "chunk_id": "jiraiya_arc_003"
  }
}
```

### Chunking Strategy
- Do NOT chunk by character count alone
- Chunk by **scene or event** — one chunk = one meaningful plot event
- Target ~300–500 tokens per chunk with 50-token overlap
- Use LangChain's `RecursiveCharacterTextSplitter` as a baseline, then manually review arc boundary chunks

---

## Arc Definitions (`pipeline/arcs.json`)

Maintain a canonical list of arcs with episode ranges. This powers the arc picker UI and the spoiler filter.

```json
[
  { "id": "land_of_waves", "name": "Land of Waves Arc", "part": "part1", "episode_start": 1, "episode_end": 19 },
  { "id": "chunin_exams", "name": "Chunin Exams Arc", "part": "part1", "episode_start": 20, "episode_end": 67 },
  { "id": "konoha_crush", "name": "Konoha Crush Arc", "part": "part1", "episode_start": 68, "episode_end": 80 },
  { "id": "search_for_tsunade", "name": "Search for Tsunade Arc", "part": "part1", "episode_start": 81, "episode_end": 100 },
  { "id": "sasuke_retrieval", "name": "Sasuke Retrieval Arc", "part": "part1", "episode_start": 107, "episode_end": 135 },
  { "id": "kazekage_rescue", "name": "Kazekage Rescue Arc", "part": "shippuden", "episode_start": 1, "episode_end": 32 },
  { "id": "sai_and_sasuke", "name": "Sai and Sasuke Arc", "part": "shippuden", "episode_start": 33, "episode_end": 53 },
  { "id": "hidan_kakuzu", "name": "Hidan and Kakuzu Arc", "part": "shippuden", "episode_start": 72, "episode_end": 88 },
  { "id": "jiraiya_arc", "name": "Tale of Jiraiya the Gallant", "part": "shippuden", "episode_start": 133, "episode_end": 152 },
  { "id": "pain_assault", "name": "Pain's Assault Arc", "part": "shippuden", "episode_start": 152, "episode_end": 175 }
]
```

Expand this list to cover all arcs before launch.

---

## Spoiler Control System

Three modes, selectable globally in Settings and overridable per session:

| Mode | Label | Behavior |
|---|---|---|
| `safe` | 🛡 Safe Mode | Filter chunks to `episode_start <= user's current episode` |
| `full` | ⚠️ Full Series | No filter — all chunks available |
| `custom` | 🎯 Custom | User selects which arcs they've completed via arc picker |

**Implementation note:** All three modes use the same underlying filter — `full` simply passes `episode_start <= 9999`. Never rely on prompting the LLM to "avoid spoilers" — enforce it at retrieval time by filtering the vector search.

---

## Backend: Query Endpoint

### `POST /query`

Request:
```json
{
  "question": "How did Jiraiya die?",
  "spoiler_mode": "safe",
  "max_episode": 140
}
```

Response:
```json
{
  "answer": "...",
  "sources": ["Tale of Jiraiya the Gallant Arc", "Pain's Assault Arc"],
  "spoiler_boundary_hit": false
}
```

### Query Flow

```
1. Embed the user's question via OpenAI embeddings
2. Run pgvector similarity search with metadata filter:
   WHERE metadata->>'episode_start' <= max_episode (if safe/custom mode)
3. Retrieve top 5 chunks
4. If no relevant chunks found → return "I don't have info on that yet"
5. If chunks found but all are beyond boundary → return spoiler boundary message
6. Build prompt with retrieved chunks as context
7. Call Groq (llama-3.3-70b-versatile) → stream response back
```

---

## Groq Prompt Template

```
You are NarutoQ, an expert on the Naruto anime series.
Answer the user's question using ONLY the context provided below.
Be concise but complete. If the context doesn't contain enough information, say so.
Do not invent plot details.

Context:
{retrieved_chunks}

Question: {user_question}

Answer:
```

---

## Mobile App: Key Screens

### HomeScreen
- Naruto logo/branding
- Quick-start: "Ask anything" search bar
- Link to Settings (spoiler mode + arc picker)

### ChatScreen
- Standard chat bubble UI
- Show source arc below each answer (e.g. "From: Tale of Jiraiya the Gallant Arc")
- If spoiler boundary hit: show "That happens after where you are 🍃" message

### SettingsScreen
- Spoiler mode selector (Safe / Full / Custom)
- Arc picker (shown only in Custom mode):
  - Grouped by Part 1 / Shippuden
  - Checkboxes per arc
  - "Mark all as watched" shortcut

---

## Build Order (Phases)

### Phase 1 — Data Pipeline
- [ ] `fetch_wiki.py` — fetch pages from Narutopedia MediaWiki API
- [ ] `chunk.py` — split into tagged chunks
- [ ] `embed_and_load.py` — embed + insert into pgvector
- [ ] Manually test: query "how did Jiraiya die?" via raw SQL + cosine similarity

### Phase 2 — Backend
- [ ] FastAPI setup with `/query` endpoint
- [ ] pgvector retriever with spoiler filter
- [ ] Groq llama-3.3-70b-versatile integration + prompt builder
- [ ] Test spoiler boundary logic with edge cases

### Phase 3 — Mobile App
- [ ] Expo project setup
- [ ] Chat UI + API connection
- [ ] Spoiler mode toggle
- [ ] Arc picker component

### Phase 4 — Polish
- [ ] Streaming responses (feels faster)
- [ ] Source attribution in answers
- [ ] Onboarding flow (what's your spoiler preference?)
- [ ] Error states (no answer found, boundary hit)

---

## Environment Variables

```
GROQ_API_KEY=
DATABASE_URL=postgresql://localhost:5432/narutoq
```

---

## Known Design Decisions & Rationale

- **pgvector over Pinecone** — keeps the stack simple (one DB), free to self-host, good enough for a single-anime MVP
- **Spoiler filter at retrieval, not prompt** — LLMs can "leak" knowledge even when instructed not to; filtering the context is the only reliable approach
- **Chunk by scene/event, not token count** — Naruto arcs have dense lore; splitting mid-scene breaks retrieval quality
- **Start with Naruto only** — validate the full pipeline on one anime before expanding
- **Groq + llama-3.3-70b-versatile** — 14,400 req/day free, very fast inference, OpenAI-compatible API; upgrade path is Groq paid tier or switch to Gemini Flash if quality needs increase
- **fastembed over OpenAI embeddings** — fully free, runs locally via ONNX (no PyTorch needed), `BAAI/bge-small-en-v1.5` quality is sufficient for single-series RAG; if expanding to multiple anime, re-embed everything with the same model
- **MediaWiki API over XML dump** — no large file download needed for MVP; fetch only relevant page categories
