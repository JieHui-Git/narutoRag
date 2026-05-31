from pydantic import BaseModel
from typing import Literal


class QueryRequest(BaseModel):
    question: str
    spoiler_mode: Literal["safe", "full", "custom"] = "safe"
    max_episode: int = 9999  # ignored when spoiler_mode is "full"


class QueryResponse(BaseModel):
    answer: str
    sources: list[str]           # arc names used in the answer
    spoiler_boundary_hit: bool   # true if relevant chunks were filtered out
