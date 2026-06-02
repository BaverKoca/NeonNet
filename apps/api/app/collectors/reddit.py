import asyncio
from datetime import datetime, timezone
from typing import Any

import httpx

REDDIT_SUBREDDITS = [
    "technology",
    "programming",
    "worldnews",
    "science",
    "cybersecurity",
    "artificial",
    "MachineLearning",
]
REDDIT_HOT_URL = "https://www.reddit.com/r/{subreddit}/hot.json?limit=25"
REDDIT_USER_AGENT = "NeonNetLocal/0.1"


class RedditCollectorError(Exception):
    """Raised when Reddit public JSON listings cannot be reached or parsed."""


def _format_created_at(timestamp: int | float | None) -> str:
    if timestamp is None:
        return ""

    return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat().replace("+00:00", "Z")


def _normalize_post(post: dict[str, Any], subreddit: str) -> dict[str, Any]:
    permalink = post.get("permalink") or ""

    return {
        "source": "reddit",
        "id": str(post.get("id", "")),
        "title": post.get("title") or "",
        "url": f"https://reddit.com{permalink}" if permalink else None,
        "score": post.get("score") or 0,
        "comments": post.get("num_comments") or 0,
        "created_at": _format_created_at(post.get("created_utc")),
        "subreddit": post.get("subreddit") or subreddit,
    }


async def fetch_hot_posts(subreddits: list[str] | None = None) -> list[dict[str, Any]]:
    selected_subreddits = subreddits or REDDIT_SUBREDDITS

    try:
        async with httpx.AsyncClient(
            timeout=12.0,
            headers={"User-Agent": REDDIT_USER_AGENT},
            follow_redirects=True,
        ) as client:
            responses = await asyncio.gather(
                *[
                    client.get(REDDIT_HOT_URL.format(subreddit=subreddit))
                    for subreddit in selected_subreddits
                ]
            )

        posts: list[dict[str, Any]] = []
        for subreddit, response in zip(selected_subreddits, responses):
            response.raise_for_status()
            payload = response.json()
            children = payload.get("data", {}).get("children", [])

            if not isinstance(children, list):
                continue

            for child in children:
                post = child.get("data") if isinstance(child, dict) else None
                if isinstance(post, dict):
                    posts.append(_normalize_post(post, subreddit))

        return posts
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        raise RedditCollectorError("Failed to fetch Reddit hot posts") from exc
