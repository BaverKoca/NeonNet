import json
from datetime import datetime, timezone
from typing import Any

from app.db import get_connection, get_db_path


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def save_posts(posts: list[dict[str, Any]]) -> int:
    fetched_at = _now_iso()
    saved_count = 0

    with get_connection() as connection:
        for post in posts:
            post_id = str(post.get("id", ""))
            source = post.get("source") or ""
            title = post.get("title") or ""

            if not post_id or not source:
                continue

            cursor = connection.execute(
                """
                INSERT OR IGNORE INTO posts (
                    id,
                    source,
                    title,
                    url,
                    score,
                    comments,
                    created_at,
                    subreddit,
                    fetched_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    post_id,
                    source,
                    title,
                    post.get("url"),
                    int(post.get("score") or 0),
                    int(post.get("comments") or 0),
                    post.get("created_at") or "",
                    post.get("subreddit"),
                    fetched_at,
                ),
            )
            saved_count += cursor.rowcount

    return saved_count


def save_trend_snapshots(trends: list[dict[str, Any]]) -> int:
    created_at = _now_iso()

    with get_connection() as connection:
        connection.executemany(
            """
            INSERT INTO trend_snapshots (
                keyword,
                mentions,
                heat,
                sources,
                created_at
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            [
                (
                    trend.get("keyword") or "",
                    int(trend.get("mentions") or 0),
                    int(trend.get("heat") or 0),
                    json.dumps(trend.get("sources") or []),
                    created_at,
                )
                for trend in trends
            ],
        )

    return len(trends)


def get_trend_history(keyword: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
    safe_limit = max(1, min(limit, 500))

    if keyword:
        query = """
            SELECT id, keyword, mentions, heat, sources, created_at
            FROM trend_snapshots
            WHERE keyword = ?
            ORDER BY id DESC
            LIMIT ?
        """
        params: tuple[Any, ...] = (keyword, safe_limit)
    else:
        query = """
            SELECT id, keyword, mentions, heat, sources, created_at
            FROM trend_snapshots
            ORDER BY id DESC
            LIMIT ?
        """
        params = (safe_limit,)

    with get_connection() as connection:
        rows = connection.execute(query, params).fetchall()

    return [
        {
            "id": row["id"],
            "keyword": row["keyword"],
            "mentions": row["mentions"],
            "heat": row["heat"],
            "sources": json.loads(row["sources"]),
            "created_at": row["created_at"],
        }
        for row in rows
    ]


def get_trend_velocity(limit: int = 30) -> dict[str, Any]:
    safe_limit = max(1, min(limit, 100))

    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, keyword, heat, sources, created_at
            FROM trend_snapshots
            ORDER BY id DESC
            LIMIT 2000
            """
        ).fetchall()

    snapshots_by_keyword: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        snapshots_by_keyword.setdefault(row["keyword"], []).append(
            {
                "heat": row["heat"],
                "sources": json.loads(row["sources"]),
                "created_at": row["created_at"],
            }
        )

    items: list[dict[str, Any]] = []
    for keyword, snapshots in snapshots_by_keyword.items():
        latest = snapshots[0]
        previous = snapshots[1] if len(snapshots) > 1 else None
        previous_heat = previous["heat"] if previous else None
        velocity = latest["heat"] - previous_heat if previous_heat is not None else 0

        if previous_heat is None:
            status = "new"
        elif velocity > 0:
            status = "rising"
        elif velocity < 0:
            status = "falling"
        else:
            status = "stable"

        items.append(
            {
                "keyword": keyword,
                "latest_heat": latest["heat"],
                "previous_heat": previous_heat,
                "velocity": velocity,
                "status": status,
                "sources": latest["sources"],
                "latest_at": latest["created_at"],
            }
        )

    sorted_items = sorted(
        items,
        key=lambda item: (-abs(item["velocity"]), -item["latest_heat"], item["keyword"]),
    )[:safe_limit]

    return {"count": len(sorted_items), "items": sorted_items}


def database_path() -> str:
    return str(get_db_path())
