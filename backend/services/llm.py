import os
from groq import Groq, RateLimitError
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

MODEL = "llama-3.3-70b-versatile"

_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _client


def build_prompt(question: str, chunks: list[dict]) -> str:
    context = "\n---\n".join(c["content"] for c in chunks)
    return f"""You are NarutoQ, an expert on the Naruto anime series.
Answer the user's question using ONLY the context provided below.
Be concise but complete. If the context doesn't contain enough information, say so — do not invent plot details.

Context:
{context}

Question: {question}

Answer:"""


def ask_groq(question: str, chunks: list[dict]) -> str:
    """Send the question + retrieved context to Groq and return the answer."""
    prompt = build_prompt(question, chunks)
    client = get_client()

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=512,
        )
        return response.choices[0].message.content.strip()
    except RateLimitError:
        raise HTTPException(status_code=429, detail="rate_limit")


def stream_groq(question: str, chunks: list[dict]):
    """Yield text tokens from Groq one at a time."""
    prompt = build_prompt(question, chunks)
    client = get_client()

    try:
        stream = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=512,
            stream=True,
        )
        for chunk in stream:
            token = chunk.choices[0].delta.content
            if token:
                yield token
    except RateLimitError:
        raise HTTPException(status_code=429, detail="rate_limit")
