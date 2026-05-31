"""
Fetches Naruto lore pages from the Narutopedia MediaWiki API.

What this does:
  1. Asks the API for all pages in specific categories (arcs, characters, etc.)
  2. Downloads the wikitext content of each page and strips the markup
  3. Saves everything as JSON files in pipeline/data/raw/

Run: python pipeline/fetch_wiki.py
Run specific categories: python pipeline/fetch_wiki.py Clans Villages
"""

import json
import sys
import time
import re
import requests
import mwparserfromhell
from pathlib import Path

API_URL = "https://naruto.fandom.com/api.php"

# Categories to fetch — covers the core lore needed for Q&A
# Jutsu capped at 500: there are 3000+ jutsu pages, most are minor/stub
CATEGORIES = [
    ("Arcs", None),
    ("Characters", None),
    ("Jutsu", 500),
    ("Clans", None),
    ("Villages", None),
]

OUTPUT_DIR = Path("pipeline/data/raw")


def request_with_retry(params: dict, max_retries: int = 4) -> dict:
    """GET the API with exponential backoff on timeout/error."""
    for attempt in range(max_retries):
        try:
            response = requests.get(API_URL, params=params, timeout=30)
            return response.json()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            wait = 2 ** attempt  # 1s, 2s, 4s, 8s
            print(f"\n  Retry {attempt + 1}/{max_retries - 1} after error: {e}. Waiting {wait}s...")
            time.sleep(wait)
    return {}


def get_pages_in_category(category: str, limit: int | None = None) -> list[str]:
    """Return page titles in a Fandom wiki category, optionally capped at limit."""
    titles = []
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": f"Category:{category}",
        "cmlimit": 500,
        "cmtype": "page",
        "format": "json",
    }

    while True:
        data = request_with_retry(params)
        members = data.get("query", {}).get("categorymembers", [])
        titles.extend(m["title"] for m in members)

        if limit and len(titles) >= limit:
            return titles[:limit]

        # The API returns a "continue" token when there are more pages
        if "continue" not in data:
            break
        params["cmcontinue"] = data["continue"]["cmcontinue"]
        time.sleep(0.5)  # be polite to the API

    return titles


def get_page_wikitext(title: str) -> str | None:
    """Fetch raw wikitext for a page."""
    params = {
        "action": "query",
        "titles": title,
        "prop": "revisions",
        "rvprop": "content",
        "rvslots": "main",
        "format": "json",
    }

    data = request_with_retry(params)
    pages = data.get("query", {}).get("pages", {})
    page = next(iter(pages.values()))

    if "missing" in page:
        return None

    revisions = page.get("revisions", [])
    if not revisions:
        return None

    slots = revisions[0].get("slots", {}).get("main", {})
    return slots.get("*") or slots.get("content")


def clean_wikitext(raw: str) -> str:
    """Strip wikitext markup, returning plain readable text."""
    wikicode = mwparserfromhell.parse(raw)
    text = wikicode.strip_code(normalize=True, collapse=True)

    # Remove leftover template artifacts and excessive whitespace
    text = re.sub(r"\{\{[^}]*\}\}", "", text)
    text = re.sub(r"\[\[File:[^\]]*\]\]", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\[\[Image:[^\]]*\]\]", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)

    return text.strip()


def fetch_all(only: list[str] | None = None):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for category, page_limit in CATEGORIES:
        category_slug = category.lower().replace(" ", "_")
        output_path = OUTPUT_DIR / f"{category_slug}.json"

        # Skip if already fetched (resume mode) unless explicitly requested
        if only:
            if category not in only:
                continue
        elif output_path.exists() and output_path.stat().st_size > 100:
            print(f"Skipping {category} — already fetched ({output_path.stat().st_size // 1024}KB)")
            continue

        print(f"\nFetching category: {category}")
        cap_note = f" (capped at {page_limit})" if page_limit else ""
        titles = get_pages_in_category(category, limit=page_limit)
        print(f"  Found {len(titles)} pages{cap_note}")

        pages = []

        for i, title in enumerate(titles):
            print(f"  [{i+1}/{len(titles)}] {title:<50}", end="\r")
            wikitext = get_page_wikitext(title)
            if not wikitext:
                continue

            text = clean_wikitext(wikitext)
            if len(text) > 200:  # skip stub pages
                pages.append({"title": title, "category": category, "text": text})

            time.sleep(0.3)  # stay under rate limits

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(pages, f, ensure_ascii=False, indent=2)

        print(f"\n  Saved {len(pages)} pages to {output_path}")


if __name__ == "__main__":
    # Pass category names as args to fetch only those, e.g.: python fetch_wiki.py Clans Villages
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    fetch_all(only=only)
