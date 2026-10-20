import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceRadial, forceX, forceY, type Simulation } from "d3-force";
import { fetchCatalog, type Category } from "./api";
import { buildGraph, endId, ForceGraph, linksWithin, neighbors, nodeColor, type GLink, type GNode, type Graph } from "./Graph";

// Ten force-directed views of the catalog, side by side as tabs at /demo/graph.
// Every view is the real catalog: entries are balls, membership and see-also are links.

type Open = (id: string) => void;
type Configure = (sim: Simulation<GNode, GLink>, nodes: GNode[], links: GLink[], w: number, h: number) => void;
interface Variant { id: string; label: string; note: string; render: (g: Graph, open: Open) => ReactNode }

const W = 940, H = 640;
const openCourse = (open: Open) => (n: GNode) => { if (n.kind === "course") open(n.id); };

// 1. Everything: the whole tree plus see-also, one picture.
const confEverything: Configure = (sim, _n, links, w, h) => {
  sim.force("link", forceLink<GNode, GLink>(links).id((d) => d.id).distance((l) => (l.kind === "tree" ? 24 : 50)).strength((l) => (l.kind === "tree" ? 0.8 : 0.15)))
    .force("charge", forceManyBody().strength(-55))
    .force("center", forceCenter(w / 2, h / 2))
    .force("x", forceX(w / 2).strength(0.05))
    .force("y", forceY(h / 2).strength(0.08))
    .force("collide", forceCollide<GNode>().radius(11));
};
function Everything({ g, open }: { g: Graph; open: Open }) {
  return <ForceGraph nodes={g.nodes} links={g.links} configure={confEverything} width={W} height={H} labels="big" dim onNodeClick={openCourse(open)} />;
}

// 2. Wonder wheel: start from the root, click a ball to spin out what is connected to it.
const confWheel: Configure = (sim, _n, links, w, h) => {
  sim.force("link", forceLink<GNode, GLink>(links).id((d) => d.id).distance((l) => (l.kind === "tree" ? 70 : 90)))
    .force("charge", forceManyBody().strength(-260))
    .force("center", forceCenter(w / 2, h / 2))
    .force("collide", forceCollide<GNode>().radius(22));
};
function Wheel({ g, open }: { g: Graph; open: Open }) {
  const [shown, setShown] = useState<Set<string>>(() => new Set(["root", ...neighbors(g.links, "root")]));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["root"]));
  const nodes = useMemo(() => g.nodes.filter((n) => shown.has(n.id)), [g, shown]);
  const links = useMemo(() => linksWithin(g.links, shown), [g, shown]);
  const click = useCallback((n: GNode) => {
    const next = new Set(shown), ex = new Set(expanded);
    if (ex.has(n.id)) {
      ex.delete(n.id);
      // Collapse: drop everything that is only reachable through n.
      const keep = new Set<string>(["root"]);
      const stack = ["root"];
      while (stack.length) {
        const id = stack.pop()!;
        if (!ex.has(id) && id !== "root") continue;
        for (const m of neighbors(g.links, id)) if (next.has(m) && !keep.has(m)) { keep.add(m); stack.push(m); }
      }
      setShown(keep); setExpanded(ex);
      return;
    }
    ex.add(n.id);
    const nb = neighbors(g.links, n.id);
    for (const m of nb) {
      const node = g.byId.get(m)!;
      node.x = (n.x ?? W / 2) + (Math.random() - 0.5) * 40;
      node.y = (n.y ?? H / 2) + (Math.random() - 0.5) * 40;
      next.add(m);
    }
    setShown(next); setExpanded(ex);
  }, [g, shown, expanded]);
  return (
    <>
      <ForceGraph nodes={nodes} links={links} configure={confWheel} width={W} height={H} labels="all" onNodeClick={click} />
      <p className="muted fg-hint">Expanded balls fold back on a second click. {[...expanded].filter((id) => g.byId.get(id)?.kind === "course").slice(-1).map((id) => <a key={id} href={`/${id}`} onClick={(e) => { e.preventDefault(); open(id); }}>Open {g.byId.get(id)?.label}</a>)}</p>
    </>
  );
}

// 3. Recenter: one ball in the middle with everything connected to it; click any to make it the middle.
const confRecenter: Configure = (sim, nodes, links, w, h) => {
  sim.force("link", forceLink<GNode, GLink>(links).id((d) => d.id).distance(140))
    .force("charge", forceManyBody().strength(-500))
    .force("center", forceCenter(w / 2, h / 2))
    .force("radial", forceRadial<GNode>((d) => (d === nodes[0] ? 0 : 150), w / 2, h / 2).strength(0.6))
    .force("collide", forceCollide<GNode>().radius(26));
};
function Recenter({ g, open }: { g: Graph; open: Open }) {
  const [focus, setFocus] = useState("go");
  const nodes = useMemo(() => {
    const ids = neighbors(g.links, focus);
    const center = g.byId.get(focus)!;
    center.x = W / 2; center.y = H / 2;
    return [center, ...[...ids].map((id) => g.byId.get(id)!)];
  }, [g, focus]);
  const links = useMemo(() => linksWithin(g.links, new Set(nodes.map((n) => n.id))).filter((l) => endId(l.source) === focus || endId(l.target) === focus), [g, nodes, focus]);
  return (
    <>
      <ForceGraph nodes={nodes} links={links} configure={confRecenter} width={W} height={H} labels="all" focus={focus} onNodeClick={(n) => setFocus(n.id)} zoomable={false} />
      <p className="muted fg-hint">Double-click is not needed: a click recenters, the title above opens the course. <a href={`/${focus}`} onClick={(e) => { e.preventDefault(); open(focus); }}>Open {g.byId.get(focus)?.label}</a></p>
    </>
  );
}

// 4. Web: only entries and see-also links, no categories. Unconnected entries drift to the rim.
const confWeb: Configure = (sim, _n, links, w, h) => {
  const linked = new Set<string>();
  for (const l of links) { linked.add(endId(l.source)); linked.add(endId(l.target)); }
  sim.force("link", forceLink<GNode, GLink>(links).id((d) => d.id).distance(55).strength(0.5))
    .force("charge", forceManyBody().strength(-120))
    .force("center", forceCenter(w / 2, h / 2))
    .force("rim", forceRadial<GNode>((d) => (linked.has(d.id) ? 0 : 290), w / 2, h / 2).strength((d) => (linked.has(d.id) ? 0 : 0.8)))
    .force("collide", forceCollide<GNode>().radius(16));
};
function Web({ g, open }: { g: Graph; open: Open }) {
  const nodes = useMemo(() => g.nodes.filter((n) => n.kind === "course"), [g]);
  const links = useMemo(() => linksWithin(g.links, new Set(nodes.map((n) => n.id)), ["related"]), [g, nodes]);
  return <ForceGraph nodes={nodes} links={links} configure={confWeb} width={W} height={H} labels="all" dim onNodeClick={openCourse(open)} />;
}

// 5. Clusters: entries pulled to their category's spot on a grid; no links drawn, the grouping is the picture.
function Clusters({ g, open }: { g: Graph; open: Open }) {
  const cats = useMemo(() => g.nodes.filter((n) => n.kind === "category" || (n.kind === "branch" && g.nodes.some((c) => c.parent === n.id && c.kind === "course"))), [g]);
  const centers = useMemo(() => {
    const cols = 5, cw = W / cols, rows = Math.ceil(cats.length / cols), rh = (H - 40) / rows;
    const m = new Map<string, { x: number; y: number; label: string }>();
    cats.forEach((c, i) => m.set(c.id, { x: cw * (i % cols) + cw / 2, y: 34 + rh * Math.floor(i / cols) + rh / 2, label: c.label }));
    return m;
  }, [cats]);
  const nodes = useMemo(() => g.nodes.filter((n) => n.kind === "course"), [g]);
  const links = useMemo(() => [] as GLink[], []);
  const configure = useCallback<Configure>((sim) => {
    sim.force("x", forceX<GNode>((d) => centers.get(d.parent!)?.x ?? W / 2).strength(0.25))
      .force("y", forceY<GNode>((d) => centers.get(d.parent!)?.y ?? H / 2).strength(0.25))
      .force("charge", forceManyBody().strength(-30))
      .force("collide", forceCollide<GNode>().radius(14));
  }, [centers]);
  return (
    <div className="fg-stack">
      <svg className="fg-overlay" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {[...centers.values()].map((c) => <text key={c.label} x={c.x} y={c.y - 52} className="fg-cluster">{c.label}</text>)}
      </svg>
      <ForceGraph nodes={nodes} links={links} configure={configure} width={W} height={H} labels="hover" onNodeClick={openCourse(open)} zoomable={false} />
    </div>
  );
}

// 6. Rings: the tree as concentric rings, root in the middle, entries on the outside.
const confRings: Configure = (sim, _n, links, w, h) => {
  sim.force("link", forceLink<GNode, GLink>(links).id((d) => d.id).distance(40).strength(0.3))
    .force("charge", forceManyBody().strength(-40))
    .force("radial", forceRadial<GNode>((d) => [0, 70, 160, 290][d.depth] ?? 290, w / 2, h / 2).strength(1))
    .force("collide", forceCollide<GNode>().radius(10));
};
function Rings({ g, open }: { g: Graph; open: Open }) {
  const links = useMemo(() => g.links.filter((l) => l.kind === "tree"), [g]);
  return <ForceGraph nodes={g.nodes} links={links} configure={confRings} width={W} height={H} labels="big" dim onNodeClick={openCourse(open)} />;
}

// 7. Bubbles: no links, ball size is lesson count, languages left and codebases right; hover shows see-also.
const bubbleRadius = (n: GNode) => (n.count > 0 ? 14 + Math.sqrt(n.count) * 1.6 : 11);
const confBubbles: Configure = (sim, _n, _l, w, h) => {
  sim.force("x", forceX<GNode>((d) => (d.branch === "languages" ? w * 0.3 : w * 0.72)).strength(0.08))
    .force("y", forceY(h / 2).strength(0.08))
    .force("collide", forceCollide<GNode>().radius((d) => bubbleRadius(d) + 2).strength(0.9));
};
function Bubbles({ g, open }: { g: Graph; open: Open }) {
  const nodes = useMemo(() => g.nodes.filter((n) => n.kind === "course"), [g]);
  const links = useMemo(() => linksWithin(g.links, new Set(nodes.map((n) => n.id)), ["related"]), [g, nodes]);
  return <ForceGraph nodes={nodes} links={links} configure={confBubbles} width={W} height={H} labels="big" labelInside radius={bubbleRadius} dim linkStyle={() => ({ strokeOpacity: 0 })} onNodeClick={openCourse(open)} zoomable={false} />;
}

// 8. Obsidian: small dots, thin lines, labels only near the pointer, zoom and pan.
const confObsidian: Configure = (sim, _n, links, w, h) => {
  sim.force("link", forceLink<GNode, GLink>(links).id((d) => d.id).distance(22).strength(0.6))
    .force("charge", forceManyBody().strength(-45))
    .force("center", forceCenter(w / 2, h / 2))
    .force("collide", forceCollide<GNode>().radius(6));
};
const dotRadius = (n: GNode) => (n.kind === "course" ? (n.count > 0 ? 6 : 3.5) : n.kind === "root" ? 8 : 5);
function Obsidian({ g, open }: { g: Graph; open: Open }) {
  return <ForceGraph nodes={g.nodes} links={g.links} configure={confObsidian} width={W} height={H} labels="hover" radius={dotRadius} dim onNodeClick={openCourse(open)} />;
}

// 9. Layers: the tree top-down by depth, see-also drawn dashed and switchable.
const confLayers: Configure = (sim, _n, links, w, h) => {
  sim.force("link", forceLink<GNode, GLink>(links).id((d) => d.id).distance(30).strength((l) => (l.kind === "tree" ? 0.7 : 0.02)))
    .force("charge", forceManyBody().strength(-50))
    .force("y", forceY<GNode>((d) => 60 + d.depth * ((h - 120) / 3)).strength(1))
    .force("x", forceX(w / 2).strength(0.02))
    .force("collide", forceCollide<GNode>().radius(11));
};
function Layers({ g, open }: { g: Graph; open: Open }) {
  const [seeAlso, setSeeAlso] = useState(true);
  const links = useMemo(() => g.links.filter((l) => l.kind === "tree" || seeAlso), [g, seeAlso]);
  return (
    <>
      <label className="fg-toggle"><input type="checkbox" checked={seeAlso} onChange={(e) => setSeeAlso(e.target.checked)} /> show see-also links</label>
      <ForceGraph nodes={g.nodes} links={links} configure={confLayers} width={W} height={H} labels="big" dim onNodeClick={openCourse(open)} />
    </>
  );
}

// 10. Plex: TheBrain's layout. The focus in the middle, its category above, see-also left and right,
// siblings from the same category below. Click any ball to make it the focus.
function Plex({ g, open }: { g: Graph; open: Open }) {
  const [focus, setFocus] = useState("splash");
  const roles = useMemo(() => {
    const f = g.byId.get(focus)!;
    const r = new Map<string, "focus" | "parent" | "related" | "sibling" | "child">();
    r.set(f.id, "focus");
    if (f.parent && g.byId.has(f.parent)) r.set(f.parent, "parent");
    for (const n of g.nodes) if (n.parent === f.id) r.set(n.id, "child");
    for (const n of g.nodes) if (n.parent === f.parent && n.id !== f.id && n.kind === "course") r.set(n.id, "sibling");
    if (f.course) for (const id of f.course.related) r.set(id, "related");
    for (const n of g.nodes) if (n.course?.related.includes(f.id)) r.set(n.id, "related");
    return r;
  }, [g, focus]);
  const nodes = useMemo(() => [...roles.keys()].map((id) => g.byId.get(id)!), [g, roles]);
  const links = useMemo(() => linksWithin(g.links, new Set(roles.keys())).filter((l) => endId(l.source) === focus || endId(l.target) === focus || roles.get(endId(l.source)) === "parent" || roles.get(endId(l.target)) === "parent"), [g, roles, focus]);
  const configure = useCallback<Configure>((sim, _n, ls, w, h) => {
    const yOf = (n: GNode) => ({ focus: h / 2, parent: 90, related: h / 2, sibling: h - 90, child: h - 90 }[roles.get(n.id)!]);
    const related = _n.filter((n) => roles.get(n.id) === "related").map((n) => n.id);
    const xOf = (n: GNode) => {
      const role = roles.get(n.id)!;
      if (role === "focus" || role === "parent") return w / 2;
      if (role === "related") return related.indexOf(n.id) % 2 === 0 ? w * 0.22 : w * 0.78;
      return w / 2;
    };
    sim.force("link", forceLink<GNode, GLink>(ls).id((d) => d.id).distance(120).strength(0.05))
      .force("x", forceX<GNode>(xOf).strength(0.3))
      .force("y", forceY<GNode>(yOf).strength(0.6))
      .force("collide", forceCollide<GNode>().radius(34));
  }, [roles]);
  const f = g.byId.get(focus)!;
  useEffect(() => { f.x = W / 2; f.y = H / 2; }, [f]);
  return (
    <>
      <ForceGraph nodes={nodes} links={links} configure={configure} width={W} height={H} labels="all" focus={focus} onNodeClick={(n) => setFocus(n.id)} zoomable={false} />
      <p className="muted fg-hint">Above: its category. Sides: see also. Below: siblings. <a href={`/${focus}`} onClick={(e) => { e.preventDefault(); open(focus); }}>Open {f.label}</a></p>
    </>
  );
}

const VARIANTS: Variant[] = [
  { id: "everything", label: "Everything", note: "The whole tree plus see-also links in one picture. Hover dims the rest; drag, pan and zoom.", render: (g, open) => <Everything g={g} open={open} /> },
  { id: "wheel", label: "Wonder wheel", note: "Start from one ball; click a ball to spin out what connects to it, click again to fold it back.", render: (g, open) => <Wheel g={g} open={open} /> },
  { id: "recenter", label: "Recenter", note: "Visual Thesaurus: the middle ball and its neighbours only; click any neighbour to make it the middle.", render: (g, open) => <Recenter g={g} open={open} /> },
  { id: "web", label: "Web", note: "Only entries and see-also links; no categories. Entries nobody links to drift to the rim.", render: (g, open) => <Web g={g} open={open} /> },
  { id: "clusters", label: "Clusters", note: "No links; entries gather at their category's spot. Hover for the name.", render: (g, open) => <Clusters g={g} open={open} /> },
  { id: "rings", label: "Rings", note: "The tree as concentric rings by depth: root, branches, categories, entries.", render: (g, open) => <Rings g={g} open={open} /> },
  { id: "bubbles", label: "Bubbles", note: "Ball size is lesson count; languages left, codebases right; hover to see what an entry links to.", render: (g, open) => <Bubbles g={g} open={open} /> },
  { id: "obsidian", label: "Obsidian", note: "Obsidian's graph view: small dots, thin lines, labels only near the pointer, zoom to read.", render: (g, open) => <Obsidian g={g} open={open} /> },
  { id: "layers", label: "Layers", note: "The tree top-down in four layers; see-also links dashed across, switchable.", render: (g, open) => <Layers g={g} open={open} /> },
  { id: "plex", label: "Plex", note: "TheBrain: focus in the middle, its category above, see-also to the sides, siblings below.", render: (g, open) => <Plex g={g} open={open} /> },
];

export function GraphDemo({ onOpen }: { onOpen: Open }) {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [which, setWhich] = useState(() => VARIANTS.find((v) => v.id === window.location.hash.slice(1))?.id ?? VARIANTS[0].id);
  useEffect(() => { fetchCatalog().then((c: Category) => setGraph(buildGraph(c))).catch((e) => setError(String(e))); }, []);
  useEffect(() => { window.history.replaceState(null, "", `#${which}`); }, [which]);
  if (error) return <main className="shell"><p className="error">{error}</p></main>;
  if (!graph) return <main className="shell"><p className="muted">Loading…</p></main>;
  const v = VARIANTS.find((x) => x.id === which)!;
  return (
    <main className="shell demo">
      <p className="eyebrow">Demo: force-directed entrances</p>
      <div className="demo-tabs" role="tablist">
        {VARIANTS.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === which} className={x.id === which ? "on" : ""} onClick={() => setWhich(x.id)}>{x.label}</button>
        ))}
      </div>
      <p className="muted demo-note">{v.note} <span className="fg-legend"><i style={{ background: nodeColor({ branch: "languages" } as GNode) }} /> languages <i style={{ background: nodeColor({ branch: "codebases" } as GNode) }} /> codebases, filled = has lessons, hollow = empty.</span></p>
      <div className="demo-stage fg-stage" key={which}>{v.render(graph, onOpen)}</div>
    </main>
  );
}
