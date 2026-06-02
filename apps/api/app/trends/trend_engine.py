from typing import Any

from app.collectors.sources import fetch_public_posts
from app.trends.keyword_extractor import extract_keywords

TREND_LIMIT = 30
HEAT_MULTIPLIER = 10


def build_trends_from_posts(posts: list[dict[str, Any]], limit: int = TREND_LIMIT) -> list[dict[str, Any]]:
    titles = [post.get("title", "") for post in posts if isinstance(post.get("title", ""), str)]
    keyword_counts = extract_keywords(titles)
    keyword_sources: dict[str, set[str]] = {}

    for post in posts:
        source = post.get("source")
        title = post.get("title", "")

        if not isinstance(source, str) or not isinstance(title, str):
            continue

        for keyword in extract_keywords([title]):
            keyword_sources.setdefault(keyword, set()).add(source)

    trends = [
        {
            "keyword": keyword,
            "mentions": mentions,
            "heat": mentions * HEAT_MULTIPLIER,
            "sources": sorted(keyword_sources.get(keyword, set())),
        }
        for keyword, mentions in keyword_counts.items()
    ]

    return sorted(trends, key=lambda trend: (-trend["heat"], trend["keyword"]))[:limit]


async def get_hacker_news_trends(limit: int = TREND_LIMIT) -> list[dict[str, Any]]:
    posts = await fetch_public_posts()
    return build_trends_from_posts(posts, limit)
