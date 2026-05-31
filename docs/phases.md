# Build Phases

NarutoQ is being built in four phases. This document tracks what each phase covers and its current status.

---

## Phase 1 — Data Pipeline ✅ Complete

**Goal:** Get Naruto lore into a vector database so it can be searched semantically.

### What we built

**`pipeline/fetch_wiki.py`**
- Queries the Narutopedia MediaWiki API for pages in 5 categories: Arcs, Characters, Jutsu, Clans, Villages
- Downloads each page's wikitext and strips wiki markup using `mwparserfromhell`
- Saves clean text per category to `pipeline/data/raw/*.json`
- Includes retry logic with exponential backoff and a resume mode (skips already-fetched categories)

**`pipeline/chunk.py`**
- Splits each page into ~400-token chunks with 50-token overlap using LangChain's `RecursiveCharacterTextSplitter`
- Tags each chunk with arc metadata: `arc`, `arc_id`, `episode_start`, `episode_end`, `part`, `source_page`
- Arc matching is done by keyword-matching page titles against `arcs.json`
- Pages that don't match an arc get `episode_start: 0` (always visible)

**`pipeline/embed_and_load.py`**
- Embeds each chunk using `fastembed` with `BAAI/bge-small-en-v1.5` (384-dim vectors)
- Inserts chunks into pgvector with `ON CONFLICT DO NOTHING` for safe re-runs
- Processes in batches of 64 for efficiency

**`pipeline/arcs.json`**
- Canonical list of 22 arcs with episode ranges, covering Part 1, Shippuden, and Boruto

### Results

- 3,940 pages fetched from Narutopedia
- 12,420 chunks stored in pgvector
- Similarity search validated: "how did Jiraiya die?" returns correct chunks
- Spoiler filter validated: episode ≤ 100 correctly excludes Jiraiya arc chunks (episode 133+)

---

## Phase 2 — Backend ✅ Complete

**Goal:** Build a FastAPI backend that accepts questions, runs retrieval, calls Groq, and returns answers.

### Endpoint: `POST /query`

**Request:**
```json
{
  "question": "How did Jiraiya die?",
  "spoiler_mode": "safe",
  "max_episode": 140
}
```

**Response:**
```json
{
  "answer": "Jiraiya was killed by Pain during their battle in Amegakure...",
  "sources": ["Tale of Jiraiya the Gallant Arc"],
  "spoiler_boundary_hit": false
}
```

### Files to build

| File | Purpose |
|---|---|
| `backend/main.py` | FastAPI app entrypoint |
| `backend/routers/query.py` | `POST /query` route |
| `backend/services/embedder.py` | Wraps fastembed for query-time embedding |
| `backend/services/retriever.py` | pgvector search + spoiler filter |
| `backend/services/llm.py` | Groq call + prompt builder |
| `backend/models/schema.py` | Pydantic request/response models |
| `backend/db.py` | Postgres connection pool |

### Query flow

```
1. Receive question + spoiler_mode + max_episode
2. Embed question → 384-dim vector
3. pgvector search: ORDER BY embedding <=> question_vector
                    WHERE episode_start <= max_episode
                    LIMIT 5
4. If no chunks found → "I don't have info on that"
5. If chunks found → build prompt with context
6. Call Groq llama-3.3-70b-versatile
7. Return answer + source arcs + spoiler_boundary_hit flag
```

---

## Phase 3 — Mobile App ✅ Complete

**Goal:** Build the React Native (Expo) mobile app with chat UI and spoiler controls.

### Screens

**HomeScreen**
- Naruto branding
- "Ask anything" search bar
- Link to Settings

**ChatScreen**
- Chat bubble UI (user questions + NarutoQ answers)
- Source arc attribution below each answer ("From: Tale of Jiraiya the Gallant Arc")
- Spoiler boundary message if no answer found within episode limit

**SettingsScreen**
- Spoiler mode selector: Safe / Full Series / Custom
- Arc picker (Custom mode only):
  - Grouped by Part 1 / Shippuden / Boruto
  - Checkbox per arc
  - "Mark all as watched" shortcut

### Components

| Component | Purpose |
|---|---|
| `ArcPicker.tsx` | Grouped arc checklist for Custom mode |
| `ChatBubble.tsx` | Individual message bubble |
| `SpoilerToggle.tsx` | Three-mode spoiler selector |

---

## Phase 4 — Polish 🔄 In Progress

**Goal:** Make the app feel production-ready before App Store / Play Store submission.

### Planned improvements

**Streaming responses**
- Stream the Groq response token-by-token instead of waiting for the full answer
- Makes the app feel significantly faster — users see text appearing rather than a loading spinner

**Better spoiler boundary UX**
- When the answer is cut off by the spoiler filter, show a friendly message: "That happens after where you are 🍃"
- Show which arc the answer would have come from, without revealing content

**Onboarding flow**
- First launch: "Where are you in the series?"
- Sets the default spoiler mode and current episode/arc

**Error states**
- No answer found: "I don't have enough info about that in my database"
- Network error: retry prompt
- Rate limit hit: graceful degradation message

**Source attribution**
- Show the arc name below each answer
- Optionally show confidence (how similar the top chunk was to the question)

**Re-ranking (stretch goal)**
- After retrieving top 10 chunks, run a cross-encoder model to re-score relevance
- Pass only the top 3 to the LLM
- Improves answer precision at the cost of slightly higher latency
