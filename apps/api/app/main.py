from fastapi import FastAPI, HTTPException, Query

from app.collectors.hacker_news import HackerNewsCollectorError, fetch_top_stories
from app.collectors.reddit import RedditCollectorError, fetch_hot_posts
from app.collectors.sources import SourceFetchError, fetch_public_posts
from app.db import init_db
from app.graph.graph_builder import build_hacker_news_graph
from app.persistence import database_path, get_trend_history, get_trend_velocity, save_posts, save_trend_snapshots
from app.trends.trend_engine import build_trends_from_posts, get_hacker_news_trends

app = FastAPI(title="NeonNet API")


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "neonnet-api"}


@app.get("/api/hn/top")
async def hacker_news_top() -> list[dict[str, object]]:
    try:
        return await fetch_top_stories()
    except HackerNewsCollectorError as exc:
        raise HTTPException(status_code=502, detail=f"Hacker News collector failed: {exc}") from exc


@app.get("/api/reddit/hot")
async def reddit_hot() -> list[dict[str, object]]:
    try:
        return await fetch_hot_posts()
    except RedditCollectorError as exc:
        raise HTTPException(status_code=502, detail=f"Reddit collector failed: {exc}") from exc


@app.post("/api/collect")
async def collect() -> dict[str, object]:
    try:
        posts = await fetch_public_posts()
    except SourceFetchError as exc:
        raise HTTPException(status_code=502, detail=f"Collector fetch failed: {exc}") from exc

    try:
        trend_items = build_trends_from_posts(posts)

        return {
            "saved_posts": save_posts(posts),
            "saved_trends": save_trend_snapshots(trend_items),
            "db_path": database_path(),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Collect snapshot failed while writing local SQLite data") from exc


@app.get("/api/history/trends")
def trend_history(
    keyword: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
) -> list[dict[str, object]]:
    try:
        return get_trend_history(keyword=keyword, limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to read local trend history") from exc


@app.get("/api/history/velocity")
def trend_velocity(limit: int = Query(default=30, ge=1, le=100)) -> dict[str, object]:
    try:
        return get_trend_velocity(limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to read trend velocity") from exc


@app.get("/api/trends")
async def trends() -> dict[str, object]:
    try:
        trend_items = await get_hacker_news_trends()
    except SourceFetchError as exc:
        raise HTTPException(status_code=502, detail=f"Trend collector failed: {exc}") from exc

    return {"source": "multi", "sources": ["hn", "reddit"], "count": len(trend_items), "trends": trend_items}


@app.get("/api/graph")
async def graph() -> dict[str, object]:
    try:
        graph_data = await build_hacker_news_graph()
    except SourceFetchError as exc:
        raise HTTPException(status_code=502, detail=f"Graph collector failed: {exc}") from exc

    nodes = graph_data["nodes"]
    edges = graph_data["edges"]

    return {
        "source": "multi",
        "sources": ["hn", "reddit"],
        "nodes_count": len(nodes),
        "edges_count": len(edges),
        "nodes": nodes,
        "edges": edges,
    }
