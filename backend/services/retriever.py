from psycopg_pool import ConnectionPool
from .embedder import embed_query

TOP_K = 5  # number of chunks to retrieve per query


def retrieve(
    question: str,
    max_episode: int,
    pool: ConnectionPool,
) -> tuple[list[dict], bool]:
    """
    Find the top-K most relevant chunks for a question, filtered by episode.

    Returns:
        chunks: list of matching chunk dicts (content + metadata)
        spoiler_boundary_hit: True if relevant chunks exist but were all filtered out
    """
    question_vector = embed_query(question)

    with pool.connection() as conn:
        with conn.cursor() as cur:

            # Main query: similarity search within the spoiler boundary
            cur.execute(
                """
                SELECT content, metadata
                FROM chunks
                WHERE (metadata->>'episode_start')::int <= %s
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (max_episode, question_vector, TOP_K),
            )
            rows = cur.fetchall()
            chunks = [{"content": row[0], "metadata": row[1]} for row in rows]

            spoiler_boundary_hit = False
            if not chunks:
                # Check if the question matches content beyond the boundary
                cur.execute(
                    """
                    SELECT COUNT(*) FROM (
                        SELECT 1 FROM chunks
                        WHERE (metadata->>'episode_start')::int > %s
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s
                    ) sub
                    """,
                    (max_episode, question_vector, TOP_K),
                )
                spoiler_boundary_hit = cur.fetchone()[0] > 0

    return chunks, spoiler_boundary_hit
