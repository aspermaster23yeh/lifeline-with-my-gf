"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useOnViewportChange,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnNodeDrag,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import "@xyflow/react/dist/style.css";

import { MonthLayer } from "@/components/canvas/month-layer";
import { MonthRuler } from "@/components/canvas/month-ruler";
import { ProjectNode, type ProjectFlowNode } from "@/components/canvas/project-node";
import { visibleProjects } from "@/lib/domain/filters";
import { laneOf } from "@/lib/domain/operations";
import {
  CARD_HEIGHT,
  DAY_WIDTH,
  dateToX,
  laneFromY,
  monthDeltaFromDrag,
  shiftByMonths,
  spanForRange,
  todayIso,
  yFromLane,
} from "@/lib/domain/timeline";
import { useUiStore } from "@/lib/store/ui-store";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

const nodeTypes = { project: ProjectNode };

function buildNodes(projects: ReturnType<typeof visibleProjects>, bundleLane: (id: string) => number, selectedId: string | null): ProjectFlowNode[] {
  return projects.map((project) => {
    const span = spanForRange(project.startDate, project.targetDate);
    return {
      id: project.id,
      type: "project",
      position: { x: span.x, y: yFromLane(bundleLane(project.id)) },
      data: { projectId: project.id },
      style: { width: span.width, height: CARD_HEIGHT },
      width: span.width,
      height: CARD_HEIGHT,
      selected: project.id === selectedId,
      draggable: true,
    };
  });
}

function buildEdges(
  connections: { id: string; sourceId: string; targetId: string }[],
  visible: Set<string>,
): Edge[] {
  return connections
    .filter((connection) => visible.has(connection.sourceId) && visible.has(connection.targetId))
    .map((connection) => ({
      id: connection.id,
      source: connection.sourceId,
      target: connection.targetId,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    }));
}

function MapCanvas() {
  const bundle = useWorkspaceStore((state) => state.bundle);
  const placeProject = useWorkspaceStore((state) => state.placeProject);
  const connect = useWorkspaceStore((state) => state.connect);
  const query = useUiStore((state) => state.query);
  const category = useUiStore((state) => state.category);
  const status = useUiStore((state) => state.status);
  const selectedProjectId = useUiStore((state) => state.selectedProjectId);
  const selectProject = useUiStore((state) => state.selectProject);
  const viewportRequest = useUiStore((state) => state.viewportRequest);
  const { resolvedTheme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState<ProjectFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [width, setWidth] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const interacting = useRef(false);
  const flow = useReactFlow();

  const projects = useMemo(() => {
    if (!bundle) {
      return [];
    }
    return visibleProjects(bundle, { query, category, status, year: "all", ownerId: "all" }, todayIso());
  }, [bundle, query, category, status]);

  useEffect(() => {
    if (!bundle || interacting.current) {
      return;
    }
    const visible = new Set(projects.map((project) => project.id));
    setNodes(buildNodes(projects, (id) => laneOf(bundle, id), selectedProjectId));
    setEdges(buildEdges(bundle.connections, visible));
  }, [bundle, projects, selectedProjectId, setNodes, setEdges]);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  const fitted = useRef(false);
  const setZoom = useUiStore((state) => state.setZoom);
  useOnViewportChange({
    onChange: (next) => {
      setViewport(next);
      if (Math.abs(useUiStore.getState().zoom - next.zoom) > 0.01) {
        setZoom(next.zoom);
      }
    },
  });

  useEffect(() => {
    if (fitted.current || width < 100) {
      return;
    }
    fitted.current = true;
    const zoom = zoomForWidth(width);
    flow.setCenter(dateToX(todayIso()) + futureShift(width, zoom), 180, { zoom });
  }, [width, flow]);

  useEffect(() => {
    if (!viewportRequest || !bundle) {
      return;
    }
    const pane = frameRef.current?.clientWidth ?? 0;
    if (viewportRequest.type === "today") {
      const zoom = flow.getZoom();
      flow.setCenter(dateToX(todayIso()) + futureShift(pane, zoom), 180, { zoom, duration: 450 });
    }
    if (viewportRequest.type === "year") {
      const zoom = flow.getZoom();
      flow.setCenter(dateToX(`${viewportRequest.year}-01-15`) + futureShift(pane, zoom), 180, { zoom, duration: 450 });
    }
    if (viewportRequest.type === "zoom-in") {
      void flow.zoomIn({ duration: 180 });
    }
    if (viewportRequest.type === "zoom-out") {
      void flow.zoomOut({ duration: 180 });
    }
    if (viewportRequest.type === "project") {
      const project = bundle.projects.find((item) => item.id === viewportRequest.projectId);
      if (!project) {
        return;
      }
      const span = spanForRange(project.startDate, project.targetDate);
      const pane = frameRef.current?.clientWidth || 360;
      const zoom = Math.min(1, Math.max(0.55, (pane - 32) / Math.max(span.width, 160)));
      const centerX = span.x + pane / zoom / 2 - 16 / zoom;
      flow.setCenter(centerX, yFromLane(laneOf(bundle, project.id)) + 40, { zoom, duration: 450 });
    }
  }, [viewportRequest, bundle, flow]);

  const onNodeDrag: OnNodeDrag<Node> = (_, node) => {
    const project = bundle?.projects.find((item) => item.id === node.id);
    if (!project) {
      return;
    }
    const months = monthDeltaFromDrag(project.startDate, node.position.x);
    const shifted = shiftByMonths(project.startDate, project.targetDate, months);
    const x = spanForRange(shifted.startDate, shifted.targetDate).x;
    setNodes((current) =>
      current.map((item) => (item.id === node.id ? { ...item, position: { x, y: node.position.y } } : item)),
    );
  };

  const onNodeDragStop: OnNodeDrag<Node> = (_, node) => {
    const project = bundle?.projects.find((item) => item.id === node.id);
    interacting.current = false;
    if (!project || !bundle) {
      return;
    }
    const months = monthDeltaFromDrag(project.startDate, node.position.x);
    const shifted = shiftByMonths(project.startDate, project.targetDate, months);
    placeProject(project.id, { ...shifted, lane: laneFromY(node.position.y) });
  };

  const onConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) {
      return;
    }
    connect(connection.source, connection.target, "enables");
  };

  return (
    <div ref={frameRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
      <MonthRuler viewport={viewport} width={width} />
      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeDragStart={() => {
            interacting.current = true;
          }}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={(_, node) => selectProject(node.id)}
          onPaneClick={() => selectProject(null)}
          onConnect={onConnect}
          isValidConnection={(connection) => {
            if (!connection.source || !connection.target || connection.source === connection.target) {
              return false;
            }
            return !bundle?.connections.some(
              (item) => item.sourceId === connection.source && item.targetId === connection.target,
            );
          }}
          fitView={false}
          panOnScroll
          zoomOnScroll={false}
          zoomOnPinch
          panOnDrag
          minZoom={0.28}
          maxZoom={1.6}
          onlyRenderVisibleElements
          deleteKeyCode={null}
          selectionOnDrag={false}
          proOptions={{ hideAttribution: false }}
          colorMode={resolvedTheme === "dark" ? "dark" : "light"}
          defaultEdgeOptions={{ type: "smoothstep" }}
        >
          <MonthLayer />
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.1} color="var(--map-dot)" />
        </ReactFlow>
      </div>
    </div>
  );
}

function zoomForWidth(width: number): number {
  const days = width < 520 ? 46 : width < 900 ? 64 : 92;
  return Math.min(1, Math.max(0.55, width / (days * DAY_WIDTH)));
}

function futureShift(width: number, zoom: number): number {
  if (width >= 720 || zoom <= 0) {
    return 0;
  }
  return (width * 0.18) / zoom;
}

export function LifeMap() {
  return (
    <ReactFlowProvider>
      <MapCanvas />
    </ReactFlowProvider>
  );
}
