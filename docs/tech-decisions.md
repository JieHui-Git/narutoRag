# Tech Decisions

Every meaningful technical choice made in this project, and the reasoning behind it.

---

## LLM: Groq + Llama 3.3 70B over Gemini 2.0 Flash

**Decision:** Use Groq's `llama-3.3-70b-versatile` as the generation model.

**Why Groq over Gemini:**
- Groq's free tier gives 14,400 requests/day vs Gemini 2.0 Flash's 1,500/day — nearly 10x more runway before hitting limits
- At ~500 tokens per answer, 14,400 req/day supports roughly 100+ active users before needing to pay
- Groq uses an OpenAI-compatible API, so switching providers later requires changing only the model name and base URL
- Inference is extremely fast (Groq uses custom hardware called LPUs), which matters for mobile UX

**Why Llama 3.3 70B specifically:**
- Strong instruction-following — critical for RAG where the model must stay strictly within provided context
- 70B parameters gives high quality without needing to pay for a proprietary model
- Validated to not hallucinate plot details when given explicit context

**Upgrade path:** Groq paid tier or Gemini 2.5 Flash if quality needs increase.

---

## Embeddings: fastembed (local) over OpenAI

**Decision:** Use `fastembed` with the `BAAI/bge-small-en-v1.5` model, running locally on CPU.

**Why not OpenAI embeddings:**
- OpenAI requires an API key and costs money per token (even if very cheap — ~$0.08 for the whole dataset)
- Adds an external dependency to the pipeline; fastembed runs entirely offline
- For a single-series RAG app, `bge-small-en-v1.5` quality is more than sufficient

**Why fastembed over sentence-transformers:**
- fastembed uses ONNX runtime instead of PyTorch — significantly lighter (~130MB model vs ~1GB+ with PyTorch)
- Better compatibility with newer Python versions (PyTorch often lags on Python 3.13+)
- Simple API, minimal dependencies

**Why `BAAI/bge-small-en-v1.5` specifically:**
- 384-dimensional output — small enough to store efficiently in pgvector, large enough for good semantic quality
- Trained specifically for retrieval tasks (BGE = Beijing Academy of AI Embedding)
- Consistently ranks near the top of the MTEB retrieval benchmark for its size class

**Important constraint:** You must use the **same embedding model** at indexing time and query time. The vectors must be in the same "space" for similarity search to work. If you ever want to switch models, you need to re-embed all 12,000+ chunks.

---

## Vector DB: pgvector over Pinecone / Weaviate

**Decision:** Use pgvector (Postgres extension) instead of a dedicated vector database.

**Why pgvector:**
- Zero extra infrastructure — pgvector is just a Postgres extension, so one database handles both structured data (users, settings) and vector search
- Free to self-host; no managed service costs
- The spoiler filter is a simple SQL `WHERE` clause on the metadata JSONB column — no special vector DB query language needed
- HNSW index (`vector_cosine_ops`) gives millisecond similarity search at our scale

**Why not Pinecone / Weaviate / Qdrant:**
- All require either a paid managed service or separate infrastructure to run
- Overkill for a single-anime MVP with 12,000 chunks
- Would complicate deployment (two services instead of one)

**Scale ceiling:** pgvector performs well up to millions of vectors. For a single anime series we'll never come close to that limit.

---

## Spoiler Filter: At Retrieval, Not at the Prompt

**Decision:** Filter chunks before they reach the LLM, not by instructing the LLM to "avoid spoilers."

**Why this matters:**
LLMs cannot reliably suppress knowledge they have. Even with explicit instructions like "do not reveal anything after episode 140," the model may:
- Phrase answers in ways that hint at future events
- Confirm/deny guesses that contain spoilers
- Leak information through context clues

Filtering at retrieval is the only reliable approach. The LLM never sees chunks beyond the user's episode boundary — it cannot spoil what it doesn't have access to.

**Implementation:** A single SQL `WHERE` clause:
```sql
WHERE (metadata->>'episode_start')::int <= max_episode
```

**Known limitation:** Character pages that span the full series (e.g. the "Naruto Uzumaki" page) are tagged `episode_start: 0` because the arc matcher works at the page level, not the section level. These chunks always show through. For MVP this is acceptable; a future improvement would be to parse character pages section-by-section and tag each section to its arc.

---

## Data Source: MediaWiki API over XML Dump

**Decision:** Fetch Narutopedia pages via the MediaWiki API instead of downloading a full XML database dump.

**Why API:**
- The XML dump is 1GB+ — large to download, slow to parse
- The API lets you fetch exactly the categories you need (Arcs, Characters, Jutsu, Clans, Villages)
- No setup required — just HTTP requests

**Why not scraping the HTML directly:**
- Wikitext (the raw wiki format) is cleaner to parse than HTML — no navigation bars, ads, or formatting tags
- `mwparserfromhell` handles wikitext structurally, not with fragile regex

**Rate limiting:** We add `time.sleep(0.3)` between page fetches and `time.sleep(0.5)` between category pagination calls to avoid hammering the Narutopedia servers.

---

## Chunking: RecursiveCharacterTextSplitter with Scene-Aware Separators

**Decision:** Use LangChain's `RecursiveCharacterTextSplitter` with `~400 token` chunks and `50 token` overlap.

**Why ~400 tokens:**
- Small enough that a retrieved chunk stays focused on one topic
- Large enough to contain a complete scene or event with enough context to be useful
- Leaves room for 5 chunks + the question in the LLM's context window

**Why 50-token overlap:**
- Prevents losing context at chunk boundaries — if a sentence starts at the end of chunk 3 and finishes at the start of chunk 4, both chunks contain the overlap
- Makes retrieval more robust: a question about an event that spans a boundary can match either chunk

**Why `RecursiveCharacterTextSplitter`:**
- Splits on natural boundaries in priority order: `\n\n` (paragraph) → `\n` (line) → `. ` (sentence) → ` ` (word)
- Never splits mid-word or mid-sentence
- Better for lore content than token-based splitters, which don't respect sentence structure

---

## Backend: FastAPI over Django / Flask

**Decision:** Use FastAPI for the backend API.

**Why FastAPI:**
- Native async support — important for streaming LLM responses back to the mobile app
- Automatic request/response validation via Pydantic models
- Minimal boilerplate for a single-endpoint MVP
- Fast enough to handle concurrent requests without a separate ASGI server setup

---

## Mobile: React Native (Expo) over Flutter / Native

**Decision:** Use React Native with Expo for the mobile app.

**Why Expo:**
- Single codebase for iOS and Android
- Expo Go app lets you test on a real device without a Mac/Xcode build step during development
- Large ecosystem of UI components (chat UI libraries, etc.)
- Easy path to App Store / Play Store submission via EAS Build

---

## Python Version: 3.14 (system) with psycopg3 and fastembed

**Note:** The development machine runs Python 3.14, which is very new. This affected two package choices:

- **psycopg3** (`psycopg[binary]`) instead of psycopg2 — psycopg2-binary has no pre-built wheel for Python 3.14 and requires building from source, which in turn requires PostgreSQL headers
- **fastembed** instead of sentence-transformers — sentence-transformers depends on PyTorch, which may not have a stable wheel for Python 3.14; fastembed uses ONNX runtime which has broader Python version support

**PostgreSQL 17** (not 16) was installed because the Homebrew pgvector package was built against PostgreSQL 17/18, not 16.
