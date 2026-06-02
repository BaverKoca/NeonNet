import asyncio
from typing import Any

from app.collectors.hacker_news import HackerNewsCollectorError, fetch_top_stories
from app.collectors.reddit import RedditCollectorError, fetch_hot_posts


class SourceFetchError(Exception):
    """Raised when every configured public source fails."""


async def fetch_public_posts() -> list[dict[str, Any]]:
    results = await asyncio.gather(
        fetch_top_stories(),
        fetch_hot_posts(),
        return_exceptions=True,
    )

    posts: list[dict[str, Any]] = []
    failures: list[str] = []

    for source_name, result in zip(("hn", "reddit"), results):
        if isinstance(result, (HackerNewsCollectorError, RedditCollectorError)):
            failures.append(source_name)
            continue

        if isinstance(result, Exception):
            failures.append(source_name)
            continue

        posts.extend(result)

    if not posts:
        failed_sources = ", ".join(failures) or "unknown"
        raise SourceFetchError(f"Failed to fetch data from all sources: {failed_sources}")

    return posts
