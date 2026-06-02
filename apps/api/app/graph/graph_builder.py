from collections import Counter
from itertools import combinations
from typing import Any

from app.collectors.sources import fetch_public_posts
from app.trends.keyword_extractor import extract_keywords
from app.trends.trend_engine import HEAT_MULTIPLIER, TREND_LIMIT

NODE_SIZE_BASE = 12
NODE_SIZE_HEAT_DIVISOR = 5


def _story_titles(posts: list[dict[str, Any]]) -> list[str]:
    return [post.get("title", "") for post in posts if isinstance(post.get("title", ""), str)]


def _top_keyword_counts(titles: list[str], limit: int) -> list[tuple[str, int]]:
    keyword_counts = extract_keywords(titles)
    return sorted(keyword_counts.items(), key=lambda item: (-item[1], item[0]))[:limit]


def _keyword_sources(posts: list[dict[str, Any]]) -> dict[str, set[str]]:
    sources: dict[str, set[str]] = {}

    for post in posts:
        source = post.get("source")
        title = post.get("title", "")

        if not isinstance(source, str) or not isinstance(title, str):
            continue

        for keyword in extract_keywords([title]):
            sources.setdefault(keyword, set()).add(source)

    return sources


def _build_nodes(
    top_keywords: list[tuple[str, int]],
    keyword_sources: dict[str, set[str]],
) -> list[dict[str, Any]]:
    nodes: list[dict[str, Any]] = []

    for keyword, mentions in top_keywords:
        heat = mentions * HEAT_MULTIPLIER
        sources = sorted(keyword_sources.get(keyword, set()))
        nodes.append(
            {
                "id": keyword,
                "label": keyword,
                "type": "keyword",
                "source": sources[0] if len(sources) == 1 else "multi",
                "sources": sources,
                "mentions": mentions,
                "heat": heat,
                "size": int(NODE_SIZE_BASE + heat / NODE_SIZE_HEAT_DIVISOR),
            }
        )

    return nodes


def _build_edges(titles: list[str], top_keyword_ids: set[str]) -> list[dict[str, Any]]:
    edge_counts: Counter[tuple[str, str]] = Counter()

    for title in titles:
        title_keywords = set(extract_keywords([title]).keys()) & top_keyword_ids

        for source, target in combinations(sorted(title_keywords), 2):
            edge_counts[(source, target)] += 1

    return [
        {
            "id": f"{source}-{target}",
            "source": source,
            "target": target,
            "weight": weight,
        }
        for (source, target), weight in sorted(edge_counts.items(), key=lambda item: (-item[1], item[0]))
    ]


async def build_hacker_news_graph(limit: int = TREND_LIMIT) -> dict[str, list[dict[str, Any]]]:
    posts = await fetch_public_posts()
    titles = _story_titles(posts)
    top_keywords = _top_keyword_counts(titles, limit)
    top_keyword_ids = {keyword for keyword, _mentions in top_keywords}

    return {
        "nodes": _build_nodes(top_keywords, _keyword_sources(posts)),
        "edges": _build_edges(titles, top_keyword_ids),
    }
