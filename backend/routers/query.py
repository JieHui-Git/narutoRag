from fastapi import APIRouter, Depends
from psycopg_pool import ConnectionPool

from ..db import get_pool
from ..models.schema import QueryRequest, QueryResponse
from ..services.retriever import retrieve
from ..services.llm import ask_groq

router = APIRouter()

NO_INFO_MESSAGE = (
    "I don't have enough information about that in my database. "
    "Try rephrasing your question or asking about a different topic."
)
SPOILER_MESSAGE = (
    "That happens after where you are in the series. "
    "Update your spoiler settings to get an answer. 🍃"
)


@router.post("/query", response_model=QueryResponse)
def query(request: QueryRequest, pool: ConnectionPool = Depends(get_pool)):
    # "full" mode = no spoiler filter; pass a ceiling no arc will exceed
    max_episode = 9999 if request.spoiler_mode == "full" else request.max_episode

    chunks, spoiler_boundary_hit = retrieve(
        question=request.question,
        max_episode=max_episode,
        pool=pool,
    )

    if spoiler_boundary_hit:
        return QueryResponse(
            answer=SPOILER_MESSAGE,
            sources=[],
            spoiler_boundary_hit=True,
        )

    if not chunks:
        return QueryResponse(
            answer=NO_INFO_MESSAGE,
            sources=[],
            spoiler_boundary_hit=False,
        )

    answer = ask_groq(request.question, chunks)

    # Deduplicate arc names from retrieved chunks for source attribution
    sources = list(dict.fromkeys(
        c["metadata"].get("arc", "General")
        for c in chunks
        if c["metadata"].get("arc") != "General"
    ))

    return QueryResponse(
        answer=answer,
        sources=sources,
        spoiler_boundary_hit=False,
    )
