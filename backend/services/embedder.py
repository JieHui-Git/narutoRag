from fastembed import TextEmbedding

EMBED_MODEL = "BAAI/bge-small-en-v1.5"

# Loaded once at startup — stays in memory for the server's lifetime
_embedder: TextEmbedding | None = None


def get_embedder() -> TextEmbedding:
    global _embedder
    if _embedder is None:
        _embedder = TextEmbedding(model_name=EMBED_MODEL)
    return _embedder


def embed_query(question: str) -> list[float]:
    """Convert a question string into a 384-dim vector."""
    embedder = get_embedder()
    return list(embedder.embed([question]))[0].tolist()
