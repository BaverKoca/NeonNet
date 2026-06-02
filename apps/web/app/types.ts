export type SourceId = "hn" | "reddit";
export type NodeSource = SourceId | "multi";
export type ConnectionStatus = "connecting" | "online" | "offline";
export type SourceFilter = "all" | SourceId;

export type GraphNode = {
  id: string;
  label: string;
  type: "keyword";
  source: NodeSource;
  sources?: SourceId[];
  mentions: number;
  heat: number;
  size: number;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  weight: number;
};

export type GraphResponse = {
  source: NodeSource;
  sources?: SourceId[];
  nodes_count: number;
  edges_count: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type ActivityPost = {
  source: SourceId;
  id: string;
  title: string;
  url: string | null;
  score: number;
  comments: number;
  created_at: string;
  subreddit?: string;
};

export type TrendHistoryItem = {
  id: number;
  keyword: string;
  mentions: number;
  heat: number;
  sources: SourceId[];
  created_at: string;
};

export type CollectResponse = {
  saved_posts: number;
  saved_trends: number;
  db_path: string;
};

export type VelocityStatus = "rising" | "falling" | "stable" | "new";

export type TrendVelocityItem = {
  keyword: string;
  latest_heat: number;
  previous_heat: number | null;
  velocity: number;
  status: VelocityStatus;
  sources: SourceId[];
  latest_at: string;
};

export type TrendVelocityResponse = {
  count: number;
  items: TrendVelocityItem[];
};
