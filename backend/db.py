import os
import psycopg
from psycopg_pool import ConnectionPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/narutoq")

# Connection pool — reuses DB connections across requests instead of
# opening a new one for every query (expensive on a server)
pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    global pool
    if pool is None:
        pool = ConnectionPool(DATABASE_URL, min_size=1, max_size=10)
    return pool


def close_pool():
    global pool
    if pool:
        pool.close()
        pool = None
