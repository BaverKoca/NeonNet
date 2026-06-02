"use client";

import {
  ControlsContainer,
  SigmaContainer,
  useLoadGraph,
  useRegisterEvents,
  useSetSettings,
  useSigma,
  ZoomControl,
} from "@react-sigma/core";
import { useEffect, useMemo, useState } from "react";
import { UndirectedGraph } from "graphology";
import type { Attributes } from "graphology-types";
import type { GraphEdge, GraphNode, GraphResponse, SourceId } from "../types";

type TrendGraphProps = {
  graph: GraphResponse | null;
  isLoading: boolean;
  newNodeIds: Set<string>;
  heatedNodeIds: Set<string>;
};

type SigmaNodeAttributes = Attributes & {
  color: string;
  heat: number;
  isHeated: boolean;
  isNew: boolean;
  label: string;
  mentions: number;
  size: number;
  source: string;
  sources: SourceId[];
  targetX: number;
  targetY: number;
  x: number;
  y: number;
};

type SigmaEdgeAttributes = Attributes & {
  color: string;
  size: number;
  sourceKeyword: string;
  targetKeyword: string;
  weight: number;
};

const NODE_COLOR = "#00f5ff";
const NODE_NEW_COLOR = "#42ff9e";
const NODE_HEATED_COLOR = "#ff2fd6";
const NODE_HOVER_COLOR = "#42ff9e";
const NODE_DIM_COLOR = "rgba(0, 245, 255, 0.18)";
const EDGE_COLOR = "rgba(255, 47, 214, 0.42)";
const EDGE_HOVER_COLOR = "#ff2fd6";
const EDGE_DIM_COLOR = "rgba(255, 47, 214, 0.07)";

export default function TrendGraph({ graph, isLoading, newNodeIds, heatedNodeIds }: TrendGraphProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => graph?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [graph, selectedNodeId],
  );

  const connectedKeywords = useMemo(() => {
    if (!selectedNode || !graph) {
      return [];
    }

    return graph.edges
      .filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id)
      .map((edge) => (edge.source === selectedNode.id ? edge.target : edge.source))
      .slice(0, 12);
  }, [graph, selectedNode]);

  useEffect(() => {
    if (!graph?.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [graph, selectedNodeId]);

  if (isLoading) {
    return (
      <div className="grid h-[600px] place-items-center border border-cyan-300/25 bg-slate-950/85 px-6 text-center shadow-[0_0_80px_rgba(0,245,255,0.16)] lg:h-[740px]">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-neon-cyan">Initializing graph field...</p>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
            NeonNet is checking local API routes and preparing the HN + Reddit signal map.
          </p>
        </div>
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="grid h-[600px] place-items-center border border-slate-700/70 bg-slate-950/85 px-6 text-center text-sm text-slate-300 shadow-[0_0_55px_rgba(0,245,255,0.1)] lg:h-[740px]">
        <div>
          <p className="text-base font-semibold text-white">No graph signals visible yet.</p>
          <p className="mt-3 max-w-md leading-6 text-slate-400">
            Start the backend, refresh the dashboard, or adjust the source filter once public posts are loaded.
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-neon-cyan">
            Click Collect Snapshot to start tracking trend history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="relative h-[600px] overflow-hidden border border-cyan-300/30 bg-slate-950/90 shadow-[0_0_100px_rgba(0,245,255,0.18)] lg:h-[740px]">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-cyan-300/10 bg-slate-950/80 px-4 py-3 text-xs uppercase tracking-[0.16em] text-slate-400 backdrop-blur">
        <span className="text-neon-cyan">sigma map</span>
        <span>zoom / pan enabled</span>
      </div>

      <SigmaContainer
        className="h-full w-full"
        settings={{
          allowInvalidContainer: true,
          defaultEdgeColor: EDGE_COLOR,
          defaultNodeColor: NODE_COLOR,
          enableCameraPanning: true,
          enableCameraZooming: true,
          hideEdgesOnMove: false,
          hideLabelsOnMove: false,
          labelColor: { color: "#dffbff" },
          labelDensity: 0.1,
          labelFont: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          labelRenderedSizeThreshold: 10,
          labelSize: 13,
          renderLabels: true,
          zIndex: true,
        }}
      >
        <GraphStage
          graph={graph}
          newNodeIds={newNodeIds}
          heatedNodeIds={heatedNodeIds}
          onSelectNode={setSelectedNodeId}
        />
        <ControlsContainer position="bottom-right">
          <ZoomControl />
        </ControlsContainer>
      </SigmaContainer>

      {selectedNode ? (
        <div className="absolute bottom-4 left-4 z-20 max-w-sm border border-neon-green/40 bg-slate-950/90 p-4 text-sm text-slate-200 shadow-[0_0_40px_rgba(66,255,158,0.18)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-neon-green">selected keyword</p>
              <h3 className="mt-1 break-words text-2xl font-black text-white">{selectedNode.label}</h3>
            </div>
            <span className="border border-neon-pink/50 bg-pink-300/10 px-2 py-1 text-xs font-bold uppercase text-neon-pink">
              {selectedNode.source}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <SourcePills node={selectedNode} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs uppercase tracking-[0.14em] text-slate-400">
            <DetailStat label="mentions" value={selectedNode.mentions} />
            <DetailStat label="heat" value={selectedNode.heat} />
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.14em] text-slate-500">connected keywords</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {connectedKeywords.length > 0 ? (
              connectedKeywords.map((keyword) => (
                <span key={keyword} className="border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100">
                  {keyword}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">No direct co-occurrences.</span>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function GraphStage({
  graph,
  newNodeIds,
  heatedNodeIds,
  onSelectNode,
}: {
  graph: GraphResponse;
  newNodeIds: Set<string>;
  heatedNodeIds: Set<string>;
  onSelectNode: (nodeId: string | null) => void;
}) {
  const loadGraph = useLoadGraph<SigmaNodeAttributes, SigmaEdgeAttributes>();
  const registerEvents = useRegisterEvents<SigmaNodeAttributes, SigmaEdgeAttributes>();
  const setSettings = useSetSettings<SigmaNodeAttributes, SigmaEdgeAttributes>();
  const sigma = useSigma<SigmaNodeAttributes, SigmaEdgeAttributes>();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const adjacency = useMemo(() => buildAdjacency(graph.edges), [graph.edges]);

  useEffect(() => {
    const graphologyGraph = createGraphologyGraph(graph.nodes, graph.edges, newNodeIds, heatedNodeIds);
    loadGraph(graphologyGraph, true);
    animateGraphPositions(sigma, graphologyGraph);
  }, [graph, heatedNodeIds, loadGraph, newNodeIds, sigma]);

  useEffect(() => {
    registerEvents({
      clickNode: ({ node }) => {
        setSelectedNode(node);
        onSelectNode(node);
      },
      clickStage: () => {
        setSelectedNode(null);
        onSelectNode(null);
      },
      enterNode: ({ node }) => setHoveredNode(node),
      leaveNode: () => setHoveredNode(null),
    });
  }, [onSelectNode, registerEvents]);

  useEffect(() => {
    const activeNode = hoveredNode ?? selectedNode;

    setSettings({
      edgeReducer: (_edge, data) => {
        if (!activeNode) {
          return {
            ...data,
            color: data.isNew ? NODE_NEW_COLOR : data.isHeated ? NODE_HEATED_COLOR : data.color,
            size: data.isNew || data.isHeated ? data.size * 1.18 : data.size,
          };
        }

        const isConnected = data.sourceKeyword === activeNode || data.targetKeyword === activeNode;

        return {
          ...data,
          color: isConnected ? EDGE_HOVER_COLOR : EDGE_DIM_COLOR,
          size: isConnected ? Math.max(data.size + 1, 2) : 0.35,
          zIndex: isConnected ? 2 : 0,
        };
      },
      nodeReducer: (node, data) => {
        if (!activeNode) {
          return { ...data, color: data.color, size: data.size };
        }

        const isActive = node === activeNode;
        const isNeighbor = adjacency.get(activeNode)?.has(node) ?? false;

        return {
          ...data,
          color: isActive
            ? NODE_HOVER_COLOR
            : isNeighbor
              ? data.isNew
                ? NODE_NEW_COLOR
                : data.isHeated
                  ? NODE_HEATED_COLOR
                  : NODE_COLOR
              : NODE_DIM_COLOR,
          highlighted: isActive,
          size: isActive ? data.size * 1.35 : isNeighbor ? data.size * 1.08 : data.size * 0.72,
          zIndex: isActive ? 3 : isNeighbor ? 2 : 0,
        };
      },
    });

    sigma.refresh();
  }, [adjacency, hoveredNode, selectedNode, setSettings, sigma]);

  return null;
}

function createGraphologyGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  newNodeIds: Set<string>,
  heatedNodeIds: Set<string>,
) {
  const graphologyGraph = new UndirectedGraph<SigmaNodeAttributes, SigmaEdgeAttributes>();
  const finalPositions = runForceLayout(nodes, edges);

  nodes.forEach((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
    const radius = 1 + index * 0.02;
    const finalPosition = finalPositions.get(node.id) ?? { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };

    graphologyGraph.addNode(node.id, {
      color: newNodeIds.has(node.id) ? NODE_NEW_COLOR : heatedNodeIds.has(node.id) ? NODE_HEATED_COLOR : NODE_COLOR,
      heat: node.heat,
      isHeated: heatedNodeIds.has(node.id),
      isNew: newNodeIds.has(node.id),
      label: node.label,
      mentions: node.mentions,
      size: Math.max(node.size, 8) * (newNodeIds.has(node.id) || heatedNodeIds.has(node.id) ? 1.18 : 1),
      source: node.source,
      sources: node.sources ?? (node.source === "hn" || node.source === "reddit" ? [node.source] : []),
      targetX: finalPosition.x,
      targetY: finalPosition.y,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  });

  edges.forEach((edge) => {
    if (!graphologyGraph.hasNode(edge.source) || !graphologyGraph.hasNode(edge.target) || graphologyGraph.hasEdge(edge.id)) {
      return;
    }

    graphologyGraph.addUndirectedEdgeWithKey(edge.id, edge.source, edge.target, {
      color: edgeColor(edge.weight),
      size: Math.max(0.6, Math.min(edge.weight * 0.8, 4)),
      sourceKeyword: edge.source,
      targetKeyword: edge.target,
      weight: edge.weight,
    });
  });

  return graphologyGraph;
}

function runForceLayout(nodes: GraphNode[], edges: GraphEdge[]) {
  const positions = new Map<string, { x: number; y: number }>();
  const velocities = new Map<string, { x: number; y: number }>();
  const nodeCount = Math.max(nodes.length, 1);

  nodes.forEach((node, index) => {
    const angle = (index / nodeCount) * Math.PI * 2;
    const radius = 3 + (index % 5) * 0.35;

    positions.set(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    velocities.set(node.id, { x: 0, y: 0 });
  });

  for (let step = 0; step < 220; step += 1) {
    for (let firstIndex = 0; firstIndex < nodes.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < nodes.length; secondIndex += 1) {
        const first = positions.get(nodes[firstIndex].id);
        const second = positions.get(nodes[secondIndex].id);
        const firstVelocity = velocities.get(nodes[firstIndex].id);
        const secondVelocity = velocities.get(nodes[secondIndex].id);

        if (!first || !second || !firstVelocity || !secondVelocity) {
          continue;
        }

        const dx = first.x - second.x;
        const dy = first.y - second.y;
        const distanceSquared = Math.max(dx * dx + dy * dy, 0.04);
        const force = 0.018 / distanceSquared;

        firstVelocity.x += dx * force;
        firstVelocity.y += dy * force;
        secondVelocity.x -= dx * force;
        secondVelocity.y -= dy * force;
      }
    }

    edges.forEach((edge) => {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      const sourceVelocity = velocities.get(edge.source);
      const targetVelocity = velocities.get(edge.target);

      if (!source || !target || !sourceVelocity || !targetVelocity) {
        return;
      }

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const strength = 0.0025 * Math.max(edge.weight, 1);

      sourceVelocity.x += dx * strength;
      sourceVelocity.y += dy * strength;
      targetVelocity.x -= dx * strength;
      targetVelocity.y -= dy * strength;
    });

    nodes.forEach((node) => {
      const position = positions.get(node.id);
      const velocity = velocities.get(node.id);

      if (!position || !velocity) {
        return;
      }

      velocity.x += -position.x * 0.002;
      velocity.y += -position.y * 0.002;
      velocity.x *= 0.86;
      velocity.y *= 0.86;
      position.x += velocity.x;
      position.y += velocity.y;
    });
  }

  return positions;
}

function animateGraphPositions(
  sigma: ReturnType<typeof useSigma<SigmaNodeAttributes, SigmaEdgeAttributes>>,
  graph: UndirectedGraph<SigmaNodeAttributes, SigmaEdgeAttributes>,
) {
  const duration = 900;
  const start = performance.now();
  const nodePositions = graph.mapNodes((node, attributes) => ({
    id: node,
    startX: attributes.x,
    startY: attributes.y,
    targetX: attributes.targetX,
    targetY: attributes.targetY,
  }));

  const tick = (now: number) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    nodePositions.forEach((position) => {
      graph.setNodeAttribute(position.id, "x", position.startX + (position.targetX - position.startX) * eased);
      graph.setNodeAttribute(position.id, "y", position.startY + (position.targetY - position.startY) * eased);
    });

    sigma.refresh();

    if (progress < 1) {
      window.requestAnimationFrame(tick);
    }
  };

  window.requestAnimationFrame(tick);
}

function buildAdjacency(edges: GraphEdge[]) {
  const adjacency = new Map<string, Set<string>>();

  edges.forEach((edge) => {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, new Set());
    }
    if (!adjacency.has(edge.target)) {
      adjacency.set(edge.target, new Set());
    }

    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  return adjacency;
}

function edgeColor(weight: number) {
  const opacity = Math.min(0.18 + weight * 0.16, 0.9);
  return `rgba(255, 47, 214, ${opacity})`;
}

function DetailStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-slate-700/80 bg-slate-900/80 px-3 py-2">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-cyan-100">{value}</p>
    </div>
  );
}

function SourcePills({ node }: { node: GraphNode }) {
  const sources = node.sources ?? (node.source === "hn" || node.source === "reddit" ? [node.source] : []);

  if (sources.length === 0) {
    return (
      <span className="border border-neon-green/40 bg-green-300/10 px-2 py-1 text-xs font-semibold uppercase text-neon-green">
        Multi
      </span>
    );
  }

  return sources.map((source) => (
    <span
      key={source}
      className={`border px-2 py-1 text-xs font-semibold uppercase ${
        source === "hn"
          ? "border-neon-cyan/50 bg-cyan-300/10 text-neon-cyan"
          : "border-neon-pink/50 bg-pink-300/10 text-neon-pink"
      }`}
    >
      {source === "hn" ? "HN" : "Reddit"}
    </span>
  ));
}
