"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ActivityFeed,
  CoOccurrenceList,
  MetricCard,
  OnboardingHint,
  SourceFilterTabs,
  StatusBadge,
  StatusStrip,
  TrendCards,
  TrendHistoryPanel,
  VelocityPanel,
  sourceFilterLabel,
} from "./components/DashboardPanels";
import type {
  ActivityPost,
  CollectResponse,
  ConnectionStatus,
  GraphNode,
  GraphResponse,
  SourceFilter,
  SourceId,
  TrendHistoryItem,
  TrendVelocityItem,
  TrendVelocityResponse,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const GRAPH_ENDPOINT = "/api/graph";
const HN_ENDPOINT = "/api/hn/top";
const REDDIT_ENDPOINT = "/api/reddit/hot";
const COLLECT_ENDPOINT = "/api/collect";
const TREND_HISTORY_ENDPOINT = "/api/history/trends";
const TREND_VELOCITY_ENDPOINT = "/api/history/velocity";
const AUTO_REFRESH_MS = 60_000;
const TOP_NODE_LIMIT = 20;
const TOP_EDGE_LIMIT = 15;
const ACTIVITY_LIMIT = 20;
const PULSE_DURATION_MS = 2_600;

const TrendGraph = dynamic(() => import("./components/TrendGraph"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[600px] place-items-center border border-cyan-300/20 bg-slate-950/80 text-sm uppercase tracking-[0.18em] text-neon-cyan shadow-[0_0_60px_rgba(0,245,255,0.12)] lg:h-[740px]">
      Initializing graph renderer...
    </div>
  ),
});

export default function Home() {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [activityPosts, setActivityPosts] = useState<ActivityPost[]>([]);
  const [activityCounts, setActivityCounts] = useState({ total: 0, hn: 0, reddit: 0 });
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastRefreshMs, setLastRefreshMs] = useState<number | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [trendHistory, setTrendHistory] = useState<TrendHistoryItem[]>([]);
  const [trendVelocity, setTrendVelocity] = useState<TrendVelocityItem[]>([]);
  const [historyKeyword, setHistoryKeyword] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [velocityError, setVelocityError] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isVelocityLoading, setIsVelocityLoading] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectResult, setCollectResult] = useState<CollectResponse | null>(null);
  const [collectError, setCollectError] = useState<string | null>(null);
  const [newNodeIds, setNewNodeIds] = useState<Set<string>>(new Set());
  const [heatedNodeIds, setHeatedNodeIds] = useState<Set<string>>(new Set());
  const hasLoadedGraphRef = useRef(false);
  const previousGraphRef = useRef<GraphResponse | null>(null);
  const pulseTimeoutRef = useRef<number | null>(null);

  const fetchDashboard = useCallback(async () => {
    const hasExistingGraph = hasLoadedGraphRef.current;
    const startedAt = performance.now();

    setIsLoading(!hasExistingGraph);
    setIsRefreshing(hasExistingGraph);
    setIsVelocityLoading(!hasExistingGraph);
    setStatus("connecting");
    setError(null);

    try {
      const [graphResult, hnResult, redditResult, velocityResult] = await Promise.allSettled([
        fetchJson<GraphResponse>(GRAPH_ENDPOINT),
        fetchJson<ActivityPost[]>(HN_ENDPOINT),
        fetchJson<ActivityPost[]>(REDDIT_ENDPOINT),
        fetchJson<TrendVelocityResponse>(`${TREND_VELOCITY_ENDPOINT}?limit=30`),
      ]);

      if (graphResult.status === "rejected") {
        throw graphResult.reason instanceof Error ? graphResult.reason : new Error("Graph request failed");
      }

      const nextGraph = graphResult.value;
      const nextHnPosts = hnResult.status === "fulfilled" ? nextPostsWithSource(hnResult.value, "hn") : [];
      const nextRedditPosts =
        redditResult.status === "fulfilled" ? nextPostsWithSource(redditResult.value, "reddit") : [];
      const nextActivityPosts = [...nextHnPosts, ...nextRedditPosts];

      updatePulseState(previousGraphRef.current, nextGraph, hasExistingGraph);
      previousGraphRef.current = nextGraph;

      setGraph(nextGraph);
      setActivityPosts(sortActivityPosts(nextActivityPosts).slice(0, ACTIVITY_LIMIT));
      setActivityCounts({
        total: nextActivityPosts.length,
        hn: nextHnPosts.length,
        reddit: nextRedditPosts.length,
      });
      if (velocityResult.status === "fulfilled") {
        setTrendVelocity(velocityResult.value.items);
        setVelocityError(null);
      } else {
        setVelocityError("Unable to load trend velocity.");
      }
      setStatus("online");
      setLastUpdated(new Date());
      setLastRefreshMs(Math.round(performance.now() - startedAt));
      hasLoadedGraphRef.current = true;
    } catch (fetchError) {
      setStatus("offline");
      setError(
        fetchError instanceof Error
          ? `Unable to load dashboard data: ${fetchError.message}`
          : "Unable to load dashboard data from the backend.",
      );
      setLastRefreshMs(Math.round(performance.now() - startedAt));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsVelocityLoading(false);
    }
  }, []);

  const fetchTrendVelocity = useCallback(async () => {
    setIsVelocityLoading(true);
    setVelocityError(null);

    try {
      const response = await fetchJson<TrendVelocityResponse>(`${TREND_VELOCITY_ENDPOINT}?limit=30`);
      setTrendVelocity(response.items);
    } catch (fetchError) {
      setVelocityError(
        fetchError instanceof Error
          ? `Unable to load trend velocity: ${fetchError.message}`
          : "Unable to load trend velocity.",
      );
    } finally {
      setIsVelocityLoading(false);
    }
  }, []);

  const fetchTrendHistory = useCallback(async (keyword: string | null = null) => {
    setIsHistoryLoading(true);
    setHistoryError(null);

    try {
      const params = new URLSearchParams({ limit: "50" });
      if (keyword) {
        params.set("keyword", keyword);
      }

      setTrendHistory(await fetchJson<TrendHistoryItem[]>(`${TREND_HISTORY_ENDPOINT}?${params.toString()}`));
    } catch (fetchError) {
      setHistoryError(
        fetchError instanceof Error
          ? `Unable to load trend history: ${fetchError.message}`
          : "Unable to load trend history.",
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const collectSnapshot = useCallback(async () => {
    setIsCollecting(true);
    setCollectError(null);
    setCollectResult(null);

    try {
      const result = await postJson<CollectResponse>(COLLECT_ENDPOINT);
      setCollectResult(result);
      await fetchTrendHistory(historyKeyword);
      await fetchTrendVelocity();
    } catch (collectFailure) {
      setCollectError(
        collectFailure instanceof Error
          ? `Unable to collect snapshot: ${collectFailure.message}`
          : "Unable to collect snapshot.",
      );
    } finally {
      setIsCollecting(false);
    }
  }, [fetchTrendHistory, fetchTrendVelocity, historyKeyword]);

  const updatePulseState = useCallback((previousGraph: GraphResponse | null, nextGraph: GraphResponse, canPulse: boolean) => {
    if (!canPulse || !previousGraph) {
      return;
    }

    const previousHeat = new Map(previousGraph.nodes.map((node) => [node.id, node.heat]));
    const nextNewNodes = new Set<string>();
    const nextHeatedNodes = new Set<string>();

    nextGraph.nodes.forEach((node) => {
      const oldHeat = previousHeat.get(node.id);

      if (oldHeat === undefined) {
        nextNewNodes.add(node.id);
      } else if (node.heat > oldHeat) {
        nextHeatedNodes.add(node.id);
      }
    });

    setNewNodeIds(nextNewNodes);
    setHeatedNodeIds(nextHeatedNodes);

    if (pulseTimeoutRef.current !== null) {
      window.clearTimeout(pulseTimeoutRef.current);
    }

    pulseTimeoutRef.current = window.setTimeout(() => {
      setNewNodeIds(new Set());
      setHeatedNodeIds(new Set());
      pulseTimeoutRef.current = null;
    }, PULSE_DURATION_MS);
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    void fetchTrendHistory(null);
  }, [fetchTrendHistory]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchDashboard();
    }, AUTO_REFRESH_MS);

    return () => {
      window.clearInterval(interval);
      if (pulseTimeoutRef.current !== null) {
        window.clearTimeout(pulseTimeoutRef.current);
      }
    };
  }, [fetchDashboard]);

  const filteredGraph = useMemo(() => filterGraphBySource(graph, sourceFilter), [graph, sourceFilter]);

  const topNodes = useMemo(
    () =>
      [...(filteredGraph?.nodes ?? [])]
        .sort((first, second) => second.heat - first.heat || first.label.localeCompare(second.label))
        .slice(0, TOP_NODE_LIMIT),
    [filteredGraph],
  );

  const topEdges = useMemo(
    () =>
      [...(filteredGraph?.edges ?? [])]
        .sort((first, second) => second.weight - first.weight || first.id.localeCompare(second.id))
        .slice(0, TOP_EDGE_LIMIT),
    [filteredGraph],
  );

  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "waiting for first sync";

  return (
    <main className="min-h-screen overflow-hidden bg-[#050711] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,245,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,47,214,0.14),transparent_28%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-[1700px] flex-col gap-7 px-5 py-7 sm:px-6 lg:px-10">
        <header className="flex flex-col justify-between gap-5 border-b border-cyan-300/20 pb-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-5xl font-black tracking-normal text-white md:text-7xl">
              Neon<span className="text-neon-cyan">Net</span>
            </h1>
            <p className="mt-2 text-base font-medium uppercase tracking-[0.22em] text-neon-pink sm:text-lg">
              Real-Time Internet Map
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <StatusBadge status={status} />
            <button
              type="button"
              onClick={() => void fetchDashboard()}
              disabled={isLoading || isRefreshing}
              className="border border-neon-cyan/60 bg-cyan-300/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-neon-cyan shadow-[0_0_34px_rgba(0,245,255,0.25)] transition hover:bg-cyan-300/20 hover:shadow-[0_0_44px_rgba(0,245,255,0.35)] disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500 disabled:shadow-none"
            >
              {isLoading || isRefreshing ? "Syncing" : "Refresh"}
            </button>
          </div>
        </header>

        <StatusStrip
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          lastRefreshMs={lastRefreshMs}
          lastUpdatedLabel={lastUpdatedLabel}
        />

        <OnboardingHint />

        {error ? (
          <section className="border border-red-400/50 bg-red-950/40 p-5 text-sm text-red-100 shadow-[0_0_40px_rgba(248,113,113,0.12)]">
            <p className="font-semibold uppercase tracking-[0.18em] text-red-300">Backend Offline</p>
            <p className="mt-2 text-red-100">{error}</p>
            <p className="mt-2 text-red-200/80">
              Start FastAPI at {API_BASE_URL}, then use Refresh to reconnect the local dashboard.
            </p>
          </section>
        ) : null}

        <SourceFilterTabs activeFilter={sourceFilter} onChange={setSourceFilter} />

        <section className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
          <MetricCard
            label="Backend"
            value={status === "online" ? "connected" : status}
            tone={status === "offline" ? "pink" : "green"}
          />
          <MetricCard label="Visible Nodes" value={isLoading ? "..." : String(filteredGraph?.nodes_count ?? 0)} tone="cyan" />
          <MetricCard label="Visible Edges" value={isLoading ? "..." : String(filteredGraph?.edges_count ?? 0)} tone="pink" />
          <MetricCard label="Filter" value={sourceFilterLabel(sourceFilter)} tone="cyan" />
          <MetricCard label="Collected" value={String(activityCounts.total)} tone="green" />
          <MetricCard label="HN Posts" value={String(activityCounts.hn)} tone="cyan" />
          <MetricCard label="Reddit Posts" value={String(activityCounts.reddit)} tone="pink" />
          <MetricCard label="Refresh" value={lastRefreshMs === null ? "..." : `${lastRefreshMs}ms`} tone="green" />
        </section>

        <div className="grid flex-1 gap-6 2xl:grid-cols-[minmax(0,1.35fr)_350px_390px]">
          <section className="flex min-h-[600px] flex-col gap-4 border border-cyan-300/30 bg-slate-950/80 p-4 shadow-[0_0_95px_rgba(0,245,255,0.18)] sm:p-5">
            <div className="flex flex-col justify-between gap-2 border-b border-cyan-300/10 pb-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-cyan">Interactive Map</p>
                <h2 className="mt-1 text-2xl font-bold text-white">Cyber Trend Graph</h2>
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {newNodeIds.size + heatedNodeIds.size > 0 ? "incoming trend pulse" : "hover links / click nodes"}
              </p>
            </div>

            <TrendGraph
              graph={filteredGraph}
              isLoading={isLoading}
              newNodeIds={newNodeIds}
              heatedNodeIds={heatedNodeIds}
            />
          </section>

          <aside className="space-y-6 2xl:opacity-95">
            <TrendCards
              hasGraph={Boolean(filteredGraph)}
              heatedNodeIds={heatedNodeIds}
              isLoading={isLoading}
              newNodeIds={newNodeIds}
              nodes={topNodes}
              nodesCount={filteredGraph?.nodes_count ?? 0}
              onKeywordSelect={(keyword) => {
                setHistoryKeyword(keyword);
                void fetchTrendHistory(keyword);
              }}
            />

            <CoOccurrenceList edges={topEdges} hasGraph={Boolean(filteredGraph)} isLoading={isLoading} />
          </aside>

          <ActivityFeed posts={activityPosts} isRefreshing={isRefreshing || isLoading} />
        </div>

        <VelocityPanel error={velocityError} isLoading={isVelocityLoading} items={trendVelocity} />

        <TrendHistoryPanel
          collectError={collectError}
          collectResult={collectResult}
          historyError={historyError}
          historyKeyword={historyKeyword}
          isCollecting={isCollecting}
          isHistoryLoading={isHistoryLoading}
          onClearFilter={() => {
            setHistoryKeyword(null);
            void fetchTrendHistory(null);
          }}
          onCollect={() => void collectSnapshot()}
          rows={trendHistory}
        />

        <footer className="border-t border-cyan-300/10 py-5 text-center text-xs uppercase tracking-[0.18em] text-slate-500">
          {"Local-only \u00b7 HN + Reddit \u00b7 SQLite history"}
        </footer>
      </section>
    </main>
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, url));
  }

  return (await response.json()) as T;
}

async function postJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, url));
  }

  return (await response.json()) as T;
}

async function responseErrorMessage(response: Response, url: string) {
  try {
    const data = (await response.json()) as { detail?: string; error?: string };
    return data.detail ?? data.error ?? `${url} returned ${response.status}`;
  } catch {
    return `${url} returned ${response.status}`;
  }
}

function nextPostsWithSource(posts: ActivityPost[], source: SourceId): ActivityPost[] {
  return posts.map((post) => ({ ...post, source }));
}

function sortActivityPosts(posts: ActivityPost[]) {
  return posts.sort((first, second) => timestampMs(second.created_at) - timestampMs(first.created_at));
}

function timestampMs(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function filterGraphBySource(graph: GraphResponse | null, sourceFilter: SourceFilter): GraphResponse | null {
  if (!graph || sourceFilter === "all") {
    return graph;
  }

  const nodes = graph.nodes.filter((node) => nodeHasSource(node, sourceFilter));
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));

  return {
    ...graph,
    nodes_count: nodes.length,
    edges_count: edges.length,
    nodes,
    edges,
  };
}

function nodeHasSource(node: GraphNode, source: SourceId) {
  if (node.sources?.includes(source)) {
    return true;
  }

  return node.source === source;
}

