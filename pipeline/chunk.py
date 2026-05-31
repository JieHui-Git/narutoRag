"""
Splits fetched wiki pages into chunks and tags each with arc metadata.

What this does:
  1. Loads raw JSON files from pipeline/data/raw/
  2. Splits each page into ~400-token chunks with 50-token overlap
  3. Tags each chunk with arc/episode metadata from arcs.json
  4. Saves to pipeline/data/chunks/chunks.json

Run: python pipeline/chunk.py
"""

import json
import re
from pathlib import Path
from langchain_text_splitters import RecursiveCharacterTextSplitter

RAW_DIR = Path("pipeline/data/raw")
CHUNKS_DIR = Path("pipeline/data/chunks")
ARCS_FILE = Path("pipeline/arcs.json")

# ~400 tokens ≈ 1600 chars (1 token ≈ 4 chars); 50-token overlap ≈ 200 chars
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1600,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def load_arcs() -> list[dict]:
    with open(ARCS_FILE, encoding="utf-8") as f:
        return json.load(f)


def find_arc_for_page(title: str, arcs: list[dict]) -> dict | None:
    """Match a page title to an arc by looking for the arc name in the title."""
    title_lower = title.lower()
    for arc in arcs:
        arc_name_lower = arc["name"].lower()
        # Direct name match
        if arc_name_lower in title_lower or title_lower in arc_name_lower:
            return arc
        # Match by arc id keywords (e.g. "jiraiya" matches "jiraiya_arc")
        arc_keywords = arc["id"].replace("_arc", "").replace("_", " ")
        if arc_keywords in title_lower:
            return arc
    return None


def make_chunk_id(title: str, index: int) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", title.lower()).strip("_")
    return f"{slug}_{index:03d}"


def chunk_all():
    CHUNKS_DIR.mkdir(parents=True, exist_ok=True)
    arcs = load_arcs()

    all_chunks = []

    for raw_file in sorted(RAW_DIR.glob("*.json")):
        with open(raw_file, encoding="utf-8") as f:
            pages = json.load(f)

        print(f"\nChunking {raw_file.name} ({len(pages)} pages)")

        for page in pages:
            title = page["title"]
            text = page["text"]
            category = page["category"]

            splits = splitter.split_text(text)
            arc = find_arc_for_page(title, arcs)

            for i, chunk_text in enumerate(splits):
                if len(chunk_text.strip()) < 50:
                    continue

                chunk = {
                    "chunk_id": make_chunk_id(title, i),
                    "content": chunk_text.strip(),
                    "metadata": {
                        "source_page": title,
                        "category": category,
                        # Arc fields — filled if we matched an arc, else generic defaults
                        "arc": arc["name"] if arc else "General",
                        "arc_id": arc["id"] if arc else "general",
                        "part": arc["part"] if arc else "unknown",
                        "episode_start": arc["episode_start"] if arc else 0,
                        "episode_end": arc["episode_end"] if arc else 9999,
                    },
                }
                all_chunks.append(chunk)

        print(f"  Running total: {len(all_chunks)} chunks")

    output_path = CHUNKS_DIR / "chunks.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)

    print(f"\nDone — {len(all_chunks)} total chunks saved to {output_path}")


if __name__ == "__main__":
    chunk_all()
