"""
Embeds chunks using fastembed and loads them into pgvector.

What this does:
  1. Loads chunks from pipeline/data/chunks/chunks.json
  2. Converts each chunk's text to a 384-dim vector using BAAI/bge-small-en-v1.5
  3. Inserts chunk text + vector + metadata into the pgvector `chunks` table

The first run downloads the embedding model (~130MB). Subsequent runs use the cache.

Run: python pipeline/embed_and_load.py
"""

import json
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from fastembed import TextEmbedding
from tqdm import tqdm

load_dotenv()

CHUNKS_FILE = Path("pipeline/data/chunks/chunks.json")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/narutoq")
EMBED_MODEL = "BAAI/bge-small-en-v1.5"
BATCH_SIZE = 64  # how many chunks to embed + insert at once


def load_chunks() -> list[dict]:
    with open(CHUNKS_FILE, encoding="utf-8") as f:
        return json.load(f)


def embed_and_load():
    chunks = load_chunks()
    print(f"Loaded {len(chunks)} chunks from {CHUNKS_FILE}")

    # Load the embedding model — downloads ~130MB on first run
    print(f"\nLoading embedding model: {EMBED_MODEL}")
    embedder = TextEmbedding(model_name=EMBED_MODEL)
    print("Model ready.")

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # Check how many are already loaded (safe to re-run)
            cur.execute("SELECT COUNT(*) FROM chunks")
            existing = cur.fetchone()[0]
            if existing > 0:
                print(f"\n{existing} chunks already in DB. Skipping duplicates (upsert).")

            print(f"\nEmbedding and loading {len(chunks)} chunks in batches of {BATCH_SIZE}...")

            for batch_start in tqdm(range(0, len(chunks), BATCH_SIZE)):
                batch = chunks[batch_start : batch_start + BATCH_SIZE]
                texts = [c["content"] for c in batch]

                # fastembed returns a generator — convert to list
                embeddings = list(embedder.embed(texts))

                rows = [
                    (
                        c["chunk_id"],
                        c["content"],
                        emb.tolist(),  # numpy array → plain list for psycopg
                        json.dumps(c["metadata"]),
                    )
                    for c, emb in zip(batch, embeddings)
                ]

                # Insert, skip on duplicate chunk_id so re-runs are safe
                cur.executemany(
                    """
                    INSERT INTO chunks (chunk_id, content, embedding, metadata)
                    VALUES (%s, %s, %s::vector, %s::jsonb)
                    ON CONFLICT (chunk_id) DO NOTHING
                    """,
                    rows,
                )
                conn.commit()

            cur.execute("SELECT COUNT(*) FROM chunks")
            total = cur.fetchone()[0]

    print(f"\nDone — {total} chunks now in pgvector.")


if __name__ == "__main__":
    embed_and_load()
