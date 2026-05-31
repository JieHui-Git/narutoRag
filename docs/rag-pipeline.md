# RAG Pipeline

This document explains how the Retrieval-Augmented Generation pipeline works in NarutoQ — what each stage does, how the code achieves it, and why it produces better answers than asking an LLM directly.

---

## What is RAG?

Asking an LLM "how did Jiraiya die?" from memory is like asking someone to recall a book they read years ago — they might get the gist right but invent details. RAG changes the approach:

1. Before answering, search a database of Naruto lore for the most relevant passages
2. Hand those passages to the LLM as context
3. Tell the LLM: "answer using only what's in these passages"

The LLM becomes a reading comprehension engine, not a memory engine. It can only say what the retrieved passages say, which prevents hallucination.

The spoiler system is a natural extension: only retrieve passages that are within the user's episode boundary.

---

## Stage 1: Indexing (runs once)

The pipeline that converts raw wiki content into searchable vectors. This runs once before the app is used.

### Step A: Fetch (`pipeline/fetch_wiki.py`)

Hits the Narutopedia MediaWiki API to get the content of every page in key categories (Arcs, Characters, Jutsu, Clans, Villages).

```
API call: "give me all pages in Category:Characters"
→ 1,456 page titles

For each title:
  API call: "give me the wikitext for this page"
  → raw wikitext: "{{Infobox}}Jiraiya was one of [[Konohagakure]]'s [[Sannin]]..."

  mwparserfromhell strips the wiki markup:
  → clean text: "Jiraiya was one of Konohagakure's Sannin..."

Saved to: pipeline/data/raw/characters.json
```

The API paginates results in batches of 500, and `fetch_wiki.py` follows the `cmcontinue` token to get all pages. A 0.3s delay between requests avoids hitting rate limits.

### Step B: Chunk (`pipeline/chunk.py`)

Splits each page's text into smaller, focused pieces. The Jiraiya page is ~68,000 characters — too long to pass to a retrieval system or an LLM as a whole.

```
Jiraiya page text (68,000 chars)
→ RecursiveCharacterTextSplitter (chunk_size=1600, overlap=200)
→ ~42 chunks of ~400 tokens each

Each chunk is tagged with metadata:
{
  "chunk_id": "jiraiya_038",
  "content": "Jiraiya mortally wounded by Pain...",
  "metadata": {
    "arc": "Tale of Jiraiya the Gallant",
    "episode_start": 133,   ← spoiler filter key
    "episode_end": 152,
    "part": "shippuden",
    "source_page": "Jiraiya"
  }
}
```

The `episode_start` field is set by matching the page title against `arcs.json`. Pages that don't match any arc (e.g. general jutsu pages) get `episode_start: 0`, meaning they're always visible.

**Why overlap?** The last 50 tokens of each chunk are repeated at the start of the next. If a sentence spans a chunk boundary, both chunks contain enough of it to match a relevant query.

### Step C: Embed and Load (`pipeline/embed_and_load.py`)

Converts each chunk's text into a vector — a list of 384 numbers representing its semantic meaning — and stores it in pgvector alongside the chunk text and metadata.

```
"Jiraiya mortally wounded by Pain"
→ fastembed BAAI/bge-small-en-v1.5
→ [0.23, -0.11, 0.87, 0.04, ... ] (384 numbers)

INSERT INTO chunks (chunk_id, content, embedding, metadata)
VALUES ('jiraiya_038', '...', '[0.23, -0.11, ...]'::vector, '{...}'::jsonb)
```

The key insight: **similar meanings produce similar vectors**. "Jiraiya fought Pain" and "The Sannin battled Nagato" would produce vectors that are close in 384-dimensional space, even though no words overlap.

Chunks are processed in batches of 64 for efficiency. 12,420 chunks take ~9 minutes on CPU.

An HNSW index on the `embedding` column makes similarity search fast (milliseconds) regardless of how many chunks exist.

---

## Stage 2: Retrieval (every query)

When a user asks a question, the backend:

1. Converts the question to a vector using the same embedding model
2. Runs a pgvector similarity search, filtered by the user's episode boundary
3. Returns the top 5 most relevant chunks

```sql
SELECT content, metadata
FROM chunks
WHERE (metadata->>'episode_start')::int <= 140  -- spoiler filter
ORDER BY embedding <=> '[0.22, -0.10, ...]'::vector  -- cosine similarity
LIMIT 5;
```

The `<=>` operator is pgvector's cosine distance. It compares the question vector against every stored chunk vector and ranks them by closeness of meaning.

The spoiler filter is a plain SQL `WHERE` clause — chunks beyond episode 140 are excluded before the similarity ranking even runs. The LLM never sees them.

---

## Stage 3: Generation (every query)

The 5 retrieved chunks are assembled into a prompt and sent to Groq (Llama 3.3 70B):

```
You are NarutoQ, an expert on the Naruto anime series.
Answer the user's question using ONLY the context provided below.
Be concise but complete. If the context doesn't contain enough information, say so.
Do not invent plot details.

Context:
[chunk 1 text]
---
[chunk 2 text]
---
[chunk 3 text]
---
[chunk 4 text]
---
[chunk 5 text]

Question: How did Jiraiya die?

Answer:
```

The model reads the retrieved passages and writes a coherent answer. It doesn't use its training memory — it's purely doing reading comprehension on the context we provide.

---

## Spoiler Control

Three modes, selected in Settings:

| Mode | Behaviour | SQL filter |
|---|---|---|
| Safe | Only chunks up to your current episode | `episode_start <= user_episode` |
| Full Series | All chunks, no filter | `episode_start <= 9999` |
| Custom | User picks which arcs they've seen | `episode_start <= max(selected_arcs.episode_end)` |

All three modes use the same SQL pattern — `full` just passes a ceiling that no arc will ever exceed.

---

## Data Volume

| Category | Pages | Chunks |
|---|---|---|
| Characters | 1,456 | ~7,200 |
| Jutsu | 2,314 | ~2,800 |
| Arcs | 81 | ~876 |
| Clans | 51 | ~117 |
| Villages | 38 | ~430 |
| **Total** | **3,940** | **12,420** |

---

## Known Limitations

**Character page spoilers:** Pages like "Naruto Uzumaki" cover the entire series in one article. Our arc matcher works at the page level, so these get `episode_start: 0` and always show through the spoiler filter. A future improvement would parse character pages section-by-section and tag each section to the arc where those events occur.

**Arc matching is keyword-based:** `find_arc_for_page()` matches page titles against arc names using simple string matching. If a page title doesn't contain obvious arc keywords, it falls back to `episode_start: 0`. Improving this would require richer metadata (e.g. categories per page from the API).
