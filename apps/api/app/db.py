import os
import sqlite3
from pathlib import Path

DEFAULT_DB_PATH = "neonnet.db"


def get_db_path() -> Path:
    return Path(os.getenv("NEONNET_DB_PATH", DEFAULT_DB_PATH)).expanduser().resolve()


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(get_db_path())
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS posts (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT,
                score INTEGER DEFAULT 0,
                comments INTEGER DEFAULT 0,
                created_at TEXT,
                subreddit TEXT,
                fetched_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS trend_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                keyword TEXT NOT NULL,
                mentions INTEGER NOT NULL,
                heat INTEGER NOT NULL,
                sources TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
