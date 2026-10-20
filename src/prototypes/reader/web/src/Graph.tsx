import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type WheelEvent as RWheelEvent } from "react";
import { forceSimulation, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import type { Category, CourseSummary } from "./api";

// A force-directed view of the catalog. Nodes are entries (and, in some views, categories);
// links are category membership ("tree") and see-also ("related"). Rendering is plain SVG
// driven by d3-force; each view configures the forces itself.

export type NodeKind = "root" | "branch" | "category" | "course";

export interface GNode extends SimulationNodeDatum {
  id: string;
  label: string;
  kind: NodeKind;
  branch: string; // top-level category id, for color
  depth: number; // 0 root, 1 branch, 2 category, 3 course
  count: number; // lessons; 0 for empty entries and categories
  parent?: string;
  course?: CourseSummary;
}

export interface GLink extends SimulationLinkDatum<GNode> {
  kind: "tree" | "related";
}

export interface Graph {
  nodes: GNode[];
  links: GLink[];
  byId: Map<string, GNode>;
}

// The whole catalog as a graph. Node objects are shared between views so positions persist.
export function buildGraph(cat: Category): Graph {
  const nodes: GNode[] = [];
  const links: GLink[] = [];
  const byId = new Map<string, GNode>();
  const add = (n: GNode) => { nodes.push(n); byId.set(n.id, n); return n; };
  add({ id: "root", label: "Read", kind: "root", branch: "", depth: 0, count: 0 });
  const walk = (c: Category, depth: number, branch: string, parent: string) => {
    const id = depth === 0 ? "root" : `cat:${c.id}`;
    if (depth > 0) {
      add({ id, label: c.label, kind: depth === 1 ? "branch" : "category", branch, depth, count: 0, parent });
      links.push({ source: parent, target: id, kind: "tree" });
    }
    for (const course of c.courses) {
      add({ id: course.id, label: course.title, kind: "course", branch, depth: depth + 1, count: course.count, parent: id, course });
      links.push({ source: id, target: course.id, kind: "tree" });
    }
    for (const ch of c.children) walk(ch, depth + 1, depth === 0 ? ch.id : branch, id);
  };
  walk(cat, 0, "", "");
  const seen = new Set<string>();
  for (const n of nodes) {
    if (!n.course) continue;
    for (const r of n.course.related) {
      const key = [n.id, r].sort().join("|");
      if (seen.has(key) || !byId.has(r)) continue;
      seen.add(key);
      links.push({ source: n.id, target: r, kind: "related" });
    }
  }
  return { nodes, links, byId };
}

export const endId = (x: string | number | GNode) => (typeof x === "object" ? x.id : String(x));

// Links whose both ends are in the given node set.
export function linksWithin(links: GLink[], ids: Set<string>, kinds: GLink["kind"][] = ["tree", "related"]): GLink[] {
  return links.filter((l) => kinds.includes(l.kind) && ids.has(endId(l.source)) && ids.has(endId(l.target)));
}

export function neighbors(links: GLink[], id: string): Set<string> {
  const out = new Set<string>();
  for (const l of links) {
    const s = endId(l.source), t = endId(l.target);
    if (s === id) out.add(t);
    if (t === id) out.add(s);
  }
  return out;
}

export const BRANCH_COLOR: Record<string, string> = { languages: "var(--accent)", codebases: "var(--tok-function)" };
export const nodeColor = (n: GNode) => BRANCH_COLOR[n.branch] ?? "var(--muted)";
export const defaultRadius = (n: GNode) =>
  n.kind === "root" ? 14 : n.kind === "branch" ? 11 : n.kind === "category" ? 7 : n.count > 0 ? 6 + Math.sqrt(n.count) * 0.6 : 5;

export interface ForceGraphProps {
  nodes: GNode[];
  links: GLink[];
  configure: (sim: Simulation<GNode, GLink>, nodes: GNode[], links: GLink[], width: number, height: number) => void;
  width?: number;
  height?: number;
  labels?: "all" | "hover" | "big"; // which nodes get a text label
  labelInside?: boolean; // write the label inside the ball instead of under it
  radius?: (n: GNode) => number;
  dim?: boolean; // dim everything but the hovered node and its neighbors
  focus?: string; // drawn with a ring
  onNodeClick?: (n: GNode) => void;
  zoomable?: boolean;
  linkStyle?: (l: GLink) => React.CSSProperties | undefined;
  restartKey?: unknown; // change to reheat the simulation
}

export function ForceGraph(props: ForceGraphProps) {
  const { nodes, links, configure, width = 920, height = 620, labels = "all", labelInside = false, radius = defaultRadius, dim = false, focus, onNodeClick, zoomable = true, linkStyle, restartKey } = props;
  const [, setTick] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const sim = useRef<Simulation<GNode, GLink> | null>(null);
  const drag = useRef<{ node?: GNode; panning?: boolean; px: number; py: number; moved: boolean } | null>(null);

  useEffect(() => {
    const s = forceSimulation<GNode, GLink>(nodes);
    configure(s, nodes, links, width, height);
    // Settle the layout before the first paint, so the picture opens still instead of exploding.
    s.stop().tick(150);
    setTick((t) => t + 1);
    s.restart();
    let raf = 0;
    s.on("tick", () => {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; setTick((t) => t + 1); });
    });
    sim.current = s;
    return () => { s.stop(); cancelAnimationFrame(raf); };
  }, [nodes, links, configure, width, height, restartKey]);

  const near = useMemo(() => (hover ? neighbors(links, hover).add(hover) : null), [links, hover]);

  const toLocal = (e: RPointerEvent<SVGElement>) => {
    const r = (e.currentTarget.ownerSVGElement ?? (e.currentTarget as unknown as SVGSVGElement)).getBoundingClientRect();
    return { x: (e.clientX - r.left - view.x) / view.k, y: (e.clientY - r.top - view.y) / view.k };
  };
  const onDownNode = (n: GNode) => (e: RPointerEvent<SVGElement>) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { node: n, px: e.clientX, py: e.clientY, moved: false };
    n.fx = n.x; n.fy = n.y;
    sim.current?.alphaTarget(0.3).restart();
  };
  const onDownBg = (e: RPointerEvent<SVGSVGElement>) => {
    if (!zoomable) return;
    drag.current = { panning: true, px: e.clientX, py: e.clientY, moved: false };
  };
  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px, dy = e.clientY - d.py;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (d.node) {
      const p = toLocal(e);
      d.node.fx = p.x; d.node.fy = p.y;
    } else if (d.panning) {
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
      d.px = e.clientX; d.py = e.clientY;
    }
  };
  const onUp = () => {
    const d = drag.current;
    if (d?.node) {
      d.node.fx = null; d.node.fy = null;
      sim.current?.alphaTarget(0);
      if (!d.moved) onNodeClick?.(d.node);
    }
    drag.current = null;
  };
  const onWheel = (e: RWheelEvent<SVGSVGElement>) => {
    if (!zoomable) return;
    const r = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    setView((v) => {
      const k = Math.min(4, Math.max(0.3, v.k * (e.deltaY < 0 ? 1.1 : 0.9)));
      return { k, x: mx - ((mx - v.x) * k) / v.k, y: my - ((my - v.y) * k) / v.k };
    });
  };

  const showLabel = useCallback((n: GNode) => {
    if (labels === "all") return true;
    if (near?.has(n.id)) return true;
    if (labels === "big") return n.kind !== "course" || n.count > 0;
    return n.id === focus;
  }, [labels, near, focus]);

  return (
    <svg className="fg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      onPointerDown={onDownBg} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} onWheel={onWheel}>
      <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
        {links.map((l, i) => {
          const s = l.source as GNode, t = l.target as GNode;
          if (s.x === undefined || t.x === undefined) return null;
          const faded = dim && near && !(near.has(s.id) && near.has(t.id));
          return <line key={i} className={`fg-link ${l.kind} ${faded ? "faded" : ""}`} x1={s.x} y1={s.y} x2={t.x} y2={t.y} style={linkStyle?.(l)} />;
        })}
        {nodes.map((n) => {
          if (n.x === undefined) return null;
          const faded = dim && near && !near.has(n.id);
          const r = radius(n);
          return (
            <g key={n.id} className={`fg-node ${n.kind} ${n.count > 0 ? "filled" : "empty"} ${faded ? "faded" : ""} ${n.id === focus ? "focus" : ""}`}
              transform={`translate(${n.x},${n.y})`}
              onPointerDown={onDownNode(n)} onPointerEnter={() => setHover(n.id)} onPointerLeave={() => setHover(null)}>
              {n.id === focus && <circle r={r + 5} className="fg-ring" />}
              <circle r={r} style={{ stroke: nodeColor(n), fill: n.kind === "course" && n.count === 0 ? "var(--panel)" : nodeColor(n) }} />
              {showLabel(n) && (labelInside && n.count > 0
                ? <text dy={4} className="fg-label inside">{n.label}</text>
                : <text dy={r + 12} className={`fg-label ${n.kind}`}>{n.label}</text>)}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
