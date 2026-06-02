import asyncio
from datetime import datetime, timezone
from typing import Any

import httpx

HN_TOP_STORIES_URL = "https://hacker-news.firebaseio.com/v0/topstories.json"
HN_ITEM_URL = "https://hacker-news.firebaseio.com/v0/item/{item_id}.json"
HN_STORY_LIMIT = 30


class HackerNewsCollectorError(Exception):
    """Raised when the Hacker News API cannot be reached or parsed."""


def _format_created_at(timestamp: int | None) -> str:
    if timestamp is None:
        return ""

    return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat().replace("+00:00", "Z")


def _normalize_story(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "source": "hn",
        "id": str(item.get("id", "")),
        "title": item.get("title") or "",
        "url": item.get("url"),
        "score": item.get("score") or 0,
        "comments": item.get("descendants") or 0,
        "created_at": _format_created_at(item.get("time")),
    }


async def fetch_top_stories(limit: int = HN_STORY_LIMIT) -> list[dict[str, Any]]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            top_response = await client.get(HN_TOP_STORIES_URL)
            top_response.raise_for_status()
            story_ids = top_response.json()[:limit]

            item_responses = await asyncio.gather(
                *[client.get(HN_ITEM_URL.format(item_id=story_id)) for story_id in story_ids]
            )

        stories: list[dict[str, Any]] = []
        for response in item_responses:
            response.raise_for_status()
            item = response.json()
            if isinstance(item, dict):
                stories.append(_normalize_story(item))

        return stories
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        raise HackerNewsCollectorError("Failed to fetch Hacker News top stories") from exc
