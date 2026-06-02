import type {
  ActivityPost,
  CollectResponse,
  GraphEdge,
  GraphNode,
  SourceFilter,
  SourceId,
  TrendHistoryItem,
  TrendVelocityItem,
} from "../types";

const SOURCE_FILTERS: Array<{ id: SourceFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "hn", label: "Hacker News" },
  { id: "reddit", label: "Reddit" },
];

export function OnboardingHint() {
  return (
    <section className="border border-neon-green/30 bg-green-300/10 px-4 py-3 text-sm text-green-100 shadow-[0_0_38px_rgba(66,255,158,0.1)]">
      <p className="font-semibold uppercase tracking-[0.16em] text-neon-green">Demo path</p>
      <p className="mt-1 text-slate-300">Click Collect Snapshot to start tracking trend history.</p>
    </section>
  );
}

export function StatusStrip({
  isLoading,
  isRefreshing,
  lastRefreshMs,
  lastUpdatedLabel,
}: {
  isLoading: boolean;
  isRefreshing: boolean;
  lastRefreshMs: number | null;
  lastUpdatedLabel: string;
}) {
  return (
    <section className="flex flex-col gap-3 border border-cyan-300/20 bg-slate-950/70 px-4 py-3 text-xs uppercase tracking-[0.16em] text-slate-400 shadow-[0_0_42px_rgba(0,245,255,0.1)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-neon-cyan">terminal</span>
        <span className="text-slate-600">/</span>
        <span>auto-refresh: 60s</span>
        <span className="text-slate-600">/</span>
        <span>last updated: {lastUpdatedLabel}</span>
        <span className="text-slate-600">/</span>
        <span>duration: {lastRefreshMs === null ? "..." : `${lastRefreshMs}ms`}</span>
      </div>
      <div className="flex items-center gap-2 text-neon-green">
        <span
          className={`h-2 w-2 rounded-full bg-neon-green shadow-[0_0_16px_rgba(66,255,158,0.9)] ${
            isRefreshing || isLoading ? "animate-ping" : ""
          }`}
        />
        <span>{isRefreshing || isLoading ? "ingesting public signal stream" : "signal monitor idle"}</span>
      </div>
    </section>
  );
}

export function SourceFilterTabs({
  activeFilter,
  onChange,
}: {
  activeFilter: SourceFilter;
  onChange: (filter: SourceFilter) => void;
}) {
  return (
    <section className="flex flex-col gap-4 border border-cyan-300/20 bg-slate-950/70 p-4 shadow-[0_0_42px_rgba(0,245,255,0.1)] lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-cyan">Source Filter</p>
        <p className="mt-1 text-sm text-slate-400">Active source: {sourceFilterLabel(activeFilter)}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {SOURCE_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.id;

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onChange(filter.id)}
              className={`border px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition ${
                isActive
                  ? "border-neon-cyan bg-cyan-300/15 text-neon-cyan shadow-[0_0_28px_rgba(0,245,255,0.22)]"
                  : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-cyan-300/50 hover:text-cyan-100"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function TrendCards({
  hasGraph,
  heatedNodeIds,
  isLoading,
  newNodeIds,
  nodes,
  nodesCount,
  onKeywordSelect,
}: {
  hasGraph: boolean;
  heatedNodeIds: Set<string>;
  isLoading: boolean;
  newNodeIds: Set<string>;
  nodes: GraphNode[];
  nodesCount: number;
  onKeywordSelect: (keyword: string) => void;
}) {
  return (
    <section className="border border-cyan-300/15 bg-slate-950/75 p-5 shadow-[0_0_42px_rgba(0,245,255,0.06)]">
      <div className="border-b border-cyan-300/10 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-cyan">Top Trends</p>
        <h2 className="mt-1 text-2xl font-bold text-white">Keywords</h2>
        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
          showing top {nodes.length || 0} / {nodesCount}
        </p>
      </div>

      {isLoading ? <LoadingList /> : null}

      {!isLoading && hasGraph && nodes.length > 0 ? (
        <div className="mt-5 space-y-3">
          {nodes.map((node) => {
            const isNew = newNodeIds.has(node.id);
            const isHeated = heatedNodeIds.has(node.id);

            return (
              <article
                key={node.id}
                role="button"
                tabIndex={0}
                onClick={() => onKeywordSelect(node.label)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onKeywordSelect(node.label);
                  }
                }}
                className={`border border-cyan-300/30 bg-slate-900/85 p-4 shadow-[0_0_34px_rgba(0,245,255,0.16)] transition hover:border-cyan-200/70 hover:shadow-[0_0_46px_rgba(0,245,255,0.28)] ${
                  isNew || isHeated ? "animate-pulse border-neon-green/70 shadow-[0_0_52px_rgba(66,255,158,0.22)]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="break-words text-lg font-bold text-white">{node.label}</h3>
                  <SourceBadge node={node} />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-xs uppercase tracking-[0.12em] text-slate-400">
                  <NodeStat label="mentions" value={node.mentions} />
                  <NodeStat label="heat" value={node.heat} />
                  <NodeStat label={isNew ? "pulse" : isHeated ? "rising" : "size"} value={node.size} />
                </div>
                <div className="mt-4 h-2 border border-cyan-300/25 bg-slate-950">
                  <div
                    className="h-full animate-pulse bg-gradient-to-r from-neon-cyan via-neon-green to-neon-pink shadow-[0_0_22px_rgba(0,245,255,0.9)]"
                    style={{ width: `${Math.min(node.heat, 100)}%` }}
                  />
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {!isLoading && hasGraph && nodes.length === 0 ? (
        <div className="mt-5 border border-slate-700/70 bg-slate-900/70 px-5 py-8 text-center text-sm text-slate-300 shadow-[0_0_30px_rgba(0,245,255,0.08)]">
          No trend signals detected for this source filter yet.
        </div>
      ) : null}
    </section>
  );
}

export function CoOccurrenceList({
  edges,
  hasGraph,
  isLoading,
}: {
  edges: GraphEdge[];
  hasGraph: boolean;
  isLoading: boolean;
}) {
  return (
    <section className="border border-pink-300/15 bg-slate-950/75 p-5 shadow-[0_0_42px_rgba(255,47,214,0.06)] sm:p-6">
      <div className="border-b border-pink-300/10 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-pink">Co-Occurrences</p>
        <h2 className="mt-1 text-2xl font-bold text-white">Edges</h2>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-14 border border-slate-700/70 bg-slate-900/70" />
          ))}
        </div>
      ) : null}

      {!isLoading && hasGraph && edges.length > 0 ? (
        <div className="mt-5 space-y-3">
          {edges.map((edge) => (
            <div
              key={edge.id}
              className="border border-pink-300/25 bg-slate-900/75 px-4 py-3 shadow-[0_0_30px_rgba(255,47,214,0.12)] transition hover:border-neon-pink/60 hover:shadow-[0_0_42px_rgba(255,47,214,0.18)]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="break-words text-sm font-semibold text-pink-100">
                  {edge.source} <span className="text-neon-cyan">{"\u2194"}</span> {edge.target}
                </p>
                <span className="border border-neon-green/40 bg-green-300/10 px-2 py-1 text-xs font-bold text-neon-green">
                  {edge.weight}
                </span>
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">weight: {edge.weight}</p>
            </div>
          ))}
        </div>
      ) : null}

      {!isLoading && hasGraph && edges.length === 0 ? (
        <p className="mt-5 border border-slate-700/70 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
          No co-occurrences for the visible keywords yet.
        </p>
      ) : null}
    </section>
  );
}

export function ActivityFeed({ posts, isRefreshing }: { posts: ActivityPost[]; isRefreshing: boolean }) {
  return (
    <section className="border border-neon-green/20 bg-slate-950/75 p-5 shadow-[0_0_48px_rgba(66,255,158,0.08)]">
      <div className="flex items-start justify-between gap-4 border-b border-green-300/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-green">Live Activity</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Incoming Posts</h2>
        </div>
        <span
          className={`border border-neon-green/40 bg-green-300/10 px-2 py-1 text-xs font-semibold uppercase text-neon-green ${
            isRefreshing ? "animate-pulse" : ""
          }`}
        >
          {isRefreshing ? "sync" : "live"}
        </span>
      </div>

      <div className="mt-5 max-h-[760px] space-y-3 overflow-y-auto pr-2">
        {posts.length > 0 ? (
          posts.map((post) => (
            <article
              key={`${post.source}-${post.id}`}
              className="border border-slate-700/80 bg-slate-900/80 p-4 shadow-[0_0_26px_rgba(66,255,158,0.08)] transition hover:border-neon-green/60 hover:shadow-[0_0_42px_rgba(66,255,158,0.16)]"
            >
              <div className="flex items-start justify-between gap-3">
                <SourcePostBadge source={post.source} />
                <span className="text-xs uppercase tracking-[0.12em] text-slate-500">
                  {formatActivityTime(post.created_at)}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold leading-6 text-slate-100">{post.title || "Untitled post"}</h3>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs uppercase tracking-[0.12em] text-slate-400">
                <NodeStat label="score" value={post.score} />
                <NodeStat label="comments" value={post.comments} />
                <div>
                  <p className="text-[10px] text-slate-500">{post.source === "reddit" ? "subreddit" : "source"}</p>
                  <p className="mt-1 truncate text-base font-bold text-cyan-100">
                    {post.source === "reddit" ? post.subreddit ?? "reddit" : "HN"}
                  </p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="border border-slate-700/70 bg-slate-900/70 px-4 py-6 text-center text-sm text-slate-400">
            <p>No live posts loaded yet.</p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">Start the backend, then refresh.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export function VelocityPanel({
  error,
  isLoading,
  items,
}: {
  error: string | null;
  isLoading: boolean;
  items: TrendVelocityItem[];
}) {
  return (
    <section className="border border-neon-green/20 bg-slate-950/80 p-5 shadow-[0_0_70px_rgba(66,255,158,0.1)]">
      <div className="flex flex-col justify-between gap-3 border-b border-green-300/10 pb-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-green">Velocity</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Trend Momentum</h2>
          <p className="mt-2 text-sm text-slate-400">Comparing latest local snapshots against previous heat.</p>
        </div>
        <span
          className={`w-fit border border-neon-green/35 bg-green-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-neon-green ${
            isLoading ? "animate-pulse" : ""
          }`}
        >
          {isLoading ? "calculating" : `${items.length} signals`}
        </span>
      </div>

      {error ? (
        <div className="mt-4 border border-red-400/50 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          <p className="font-semibold text-red-200">Velocity history is unavailable right now.</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-5 border border-green-300/15 bg-slate-900/60 px-4 py-6 text-sm uppercase tracking-[0.16em] text-neon-green">
          Reading local velocity history...
        </div>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.keyword}
              className="border border-green-300/20 bg-slate-900/80 p-4 shadow-[0_0_28px_rgba(66,255,158,0.08)] transition hover:border-green-300/50 hover:shadow-[0_0_42px_rgba(66,255,158,0.16)]"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="break-words text-lg font-bold text-white">{item.keyword}</h3>
                <VelocityBadge item={item} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.sources.map((source) => (
                  <SourcePostBadge key={source} source={source} />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs uppercase tracking-[0.12em] text-slate-400">
                <NodeStat label="heat" value={item.latest_heat} />
                <NodeStat label="velocity" value={item.velocity} />
                <div>
                  <p className="text-[10px] text-slate-500">latest</p>
                  <p className="mt-1 text-base font-bold text-cyan-100">{formatActivityTime(item.latest_at)}</p>
                </div>
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.13em] text-slate-500">
                previous heat: {item.previous_heat ?? "new signal"}
              </p>
            </article>
          ))}
        </div>
      ) : null}

      {!isLoading && items.length === 0 ? (
        <div className="mt-5 border border-slate-700/70 bg-slate-900/70 px-4 py-8 text-center text-sm text-slate-400">
          <p>No velocity history yet.</p>
          <p className="mt-2 text-cyan-100">Click Collect Snapshot to start tracking trend history.</p>
        </div>
      ) : null}
    </section>
  );
}

export function TrendHistoryPanel({
  collectError,
  collectResult,
  historyError,
  historyKeyword,
  isCollecting,
  isHistoryLoading,
  onClearFilter,
  onCollect,
  rows,
}: {
  collectError: string | null;
  collectResult: CollectResponse | null;
  historyError: string | null;
  historyKeyword: string | null;
  isCollecting: boolean;
  isHistoryLoading: boolean;
  onClearFilter: () => void;
  onCollect: () => void;
  rows: TrendHistoryItem[];
}) {
  return (
    <section className="border border-cyan-300/20 bg-slate-950/80 p-5 shadow-[0_0_70px_rgba(0,245,255,0.1)]">
      <div className="flex flex-col justify-between gap-4 border-b border-cyan-300/10 pb-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-cyan">Local History</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Trend Snapshots</h2>
          <p className="mt-2 text-sm text-slate-400">
            {historyKeyword ? `Filtered by keyword: ${historyKeyword}` : "Showing latest 50 saved trend rows"}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {historyKeyword ? (
            <button
              type="button"
              onClick={onClearFilter}
              className="border border-slate-600 bg-slate-900/80 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-100"
            >
              Clear History Filter
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCollect}
            disabled={isCollecting}
            className="border border-neon-green/50 bg-green-300/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-neon-green shadow-[0_0_30px_rgba(66,255,158,0.14)] transition hover:bg-green-300/15 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500 disabled:shadow-none"
          >
            {isCollecting ? "Collecting" : "Collect Snapshot"}
          </button>
        </div>
      </div>

      {collectResult ? (
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <HistoryStatus label="Saved posts" value={collectResult.saved_posts} />
          <HistoryStatus label="Saved trends" value={collectResult.saved_trends} />
          <div className="border border-slate-700/80 bg-slate-900/80 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Database</p>
            <p className="mt-1 truncate text-cyan-100">{collectResult.db_path}</p>
          </div>
        </div>
      ) : null}

      {collectError || historyError ? (
        <div className="mt-4 border border-red-400/50 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          <p className="font-semibold text-red-200">
            {collectError ? "Snapshot collection did not complete." : "Trend history could not be loaded."}
          </p>
          <p className="mt-1">{collectError ?? historyError}</p>
        </div>
      ) : null}

      <div className="mt-5 max-h-[460px] overflow-y-auto pr-2">
        {isHistoryLoading ? (
          <div className="border border-cyan-300/15 bg-slate-900/60 px-4 py-6 text-sm uppercase tracking-[0.16em] text-neon-cyan">
            Loading local trend history...
          </div>
        ) : null}

        {!isHistoryLoading && rows.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {rows.map((row) => (
              <article
                key={row.id}
                className="border border-cyan-300/20 bg-slate-900/80 p-4 shadow-[0_0_28px_rgba(0,245,255,0.08)] transition hover:border-cyan-300/50 hover:shadow-[0_0_42px_rgba(0,245,255,0.16)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="break-words text-lg font-bold text-white">{row.keyword}</h3>
                  <div className="flex flex-wrap justify-end gap-2">
                    {row.sources.map((source) => (
                      <SourcePostBadge key={source} source={source} />
                    ))}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs uppercase tracking-[0.12em] text-slate-400">
                  <NodeStat label="mentions" value={row.mentions} />
                  <NodeStat label="heat" value={row.heat} />
                  <div>
                    <p className="text-[10px] text-slate-500">saved</p>
                    <p className="mt-1 text-base font-bold text-cyan-100">{formatActivityTime(row.created_at)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!isHistoryLoading && rows.length === 0 ? (
          <div className="border border-slate-700/70 bg-slate-900/70 px-4 py-8 text-center text-sm text-slate-400">
            <p>No trend history saved yet.</p>
            <p className="mt-2 text-cyan-100">Click Collect Snapshot to start tracking trend history.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function StatusBadge({ status }: { status: "connecting" | "online" | "offline" }) {
  const styles = {
    connecting: "border-yellow-300/50 bg-yellow-300/10 text-yellow-200 shadow-[0_0_28px_rgba(253,224,71,0.16)]",
    online: "border-neon-green/50 bg-neon-green/10 text-neon-green shadow-[0_0_30px_rgba(66,255,158,0.22)]",
    offline: "border-red-400/50 bg-red-500/10 text-red-200 shadow-[0_0_30px_rgba(248,113,113,0.18)]",
  };

  return <div className={`w-fit border px-4 py-3 text-sm uppercase tracking-[0.16em] ${styles[status]}`}>Backend: {status}</div>;
}

export function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "cyan" | "green" | "pink";
}) {
  const tones = {
    cyan: "border-cyan-300/35 text-neon-cyan shadow-[0_0_38px_rgba(0,245,255,0.14)]",
    green: "border-green-300/35 text-neon-green shadow-[0_0_38px_rgba(66,255,158,0.14)]",
    pink: "border-pink-300/35 text-neon-pink shadow-[0_0_38px_rgba(255,47,214,0.14)]",
  };

  return (
    <div className={`border bg-slate-950/75 p-4 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-black text-current">{value}</p>
    </div>
  );
}

export function sourceFilterLabel(sourceFilter: SourceFilter) {
  if (sourceFilter === "hn") {
    return "Hacker News";
  }

  if (sourceFilter === "reddit") {
    return "Reddit";
  }

  return "All";
}

function sourceBadgeLabel(node: GraphNode) {
  if (node.source === "multi" || (node.sources?.length ?? 0) > 1) {
    return "Multi";
  }

  if (node.source === "reddit" || node.sources?.[0] === "reddit") {
    return "Reddit";
  }

  return "HN";
}

function SourceBadge({ node }: { node: GraphNode }) {
  const label = sourceBadgeLabel(node);
  const styles = {
    HN: "border-neon-cyan/50 bg-cyan-300/10 text-neon-cyan",
    Reddit: "border-neon-pink/50 bg-pink-300/10 text-neon-pink",
    Multi: "border-neon-green/50 bg-green-300/10 text-neon-green",
  };

  return <span className={`border px-2 py-1 text-xs font-semibold uppercase ${styles[label]}`}>{label}</span>;
}

function HistoryStatus({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-neon-green/25 bg-green-300/10 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-neon-green">{value}</p>
    </div>
  );
}

function SourcePostBadge({ source }: { source: SourceId }) {
  return (
    <span
      className={`border px-2 py-1 text-xs font-semibold uppercase ${
        source === "hn"
          ? "border-neon-cyan/50 bg-cyan-300/10 text-neon-cyan"
          : "border-neon-pink/50 bg-pink-300/10 text-neon-pink"
      }`}
    >
      {source === "hn" ? "HN" : "Reddit"}
    </span>
  );
}

function VelocityBadge({ item }: { item: TrendVelocityItem }) {
  const styles = {
    rising: "border-neon-green/50 bg-green-300/10 text-neon-green",
    falling: "border-red-400/50 bg-red-500/10 text-red-200",
    stable: "border-slate-600 bg-slate-800/70 text-slate-300",
    new: "border-neon-cyan/50 bg-cyan-300/10 text-neon-cyan",
  };
  const icons = {
    rising: "\u2191",
    falling: "\u2193",
    stable: "-",
    new: "+",
  };

  return (
    <span className={`border px-2 py-1 text-xs font-semibold uppercase ${styles[item.status]}`}>
      {icons[item.status]} {item.status}
    </span>
  );
}

function formatActivityTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "time unknown";
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function NodeStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-bold text-cyan-100">{value}</p>
    </div>
  );
}

function LoadingList() {
  return (
    <div className="mt-5 space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="border border-cyan-300/15 bg-slate-900/60 p-4">
          <div className="h-5 w-2/3 bg-cyan-300/10" />
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="h-10 bg-slate-800/80" />
            <div className="h-10 bg-slate-800/80" />
            <div className="h-10 bg-slate-800/80" />
          </div>
          <div className="mt-5 h-2 bg-cyan-300/10" />
        </div>
      ))}
    </div>
  );
}
