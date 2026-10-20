import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Category, CourseSummary } from "./api";

// The entrance: Miller columns. The first column lists the top-level branches; selecting a row
// opens the next column to its right. A selected entry ends the row of columns with its details.

type Open = (id: string) => void;
type Item = { kind: "category"; node: Category; count: number } | { kind: "course"; course: CourseSummary };

const itemId = (it: Item) => (it.kind === "category" ? `cat:${it.node.id}` : it.course.id);
const countAll = (c: Category): number => c.courses.length + c.children.reduce((n, x) => n + countAll(x), 0);
const itemsOf = (c: Category): Item[] => [
  ...c.children.map((node) => ({ kind: "category" as const, node, count: countAll(node) })),
  ...c.courses.map((course) => ({ kind: "course" as const, course })),
];

// Path of item ids from the root to a course, for see-also jumps and for remembering the place.
function pathTo(root: Category, courseId: string): string[] | null {
  for (const c of root.courses) if (c.id === courseId) return [courseId];
  for (const ch of root.children) {
    const p = pathTo(ch, courseId);
    if (p) return [`cat:${ch.id}`, ...p];
  }
  return null;
}

function loadPath(): string[] {
  // ?at=<course-id> links straight to an entry; otherwise the place remembered on this device.
  const at = new URLSearchParams(window.location.search).get("at");
  if (at) return [`?${at}`];
  try {
    const raw = localStorage.getItem("entrance-path");
    if (raw) return JSON.parse(raw);
  } catch { /* storage unavailable */ }
  return [];
}

export function Columns({ catalog, onOpen }: { catalog: Category; onOpen: Open }) {
  const [path, setPathState] = useState<string[]>(() => {
    const p = loadPath();
    if (p[0]?.startsWith("?")) return pathTo(catalog, p[0].slice(1)) ?? [];
    // Nothing remembered: open the first branch so the page is not a single column.
    return p.length ? p : catalog.children[0] ? [`cat:${catalog.children[0].id}`] : [];
  });
  const setPath = useCallback((p: string[]) => {
    setPathState(p);
    try { localStorage.setItem("entrance-path", JSON.stringify(p)); } catch { /* storage unavailable */ }
  }, []);

  // Columns: the root's items, then the items of each selected category along the path.
  const columns = useMemo(() => {
    const cols: { items: Item[]; selected?: string }[] = [];
    let node: Category | null = catalog;
    for (let i = 0; node && i <= path.length; i++) {
      const items = itemsOf(node);
      const sel = path[i];
      const selItem = items.find((it) => itemId(it) === sel);
      cols.push({ items, selected: selItem ? sel : undefined });
      node = selItem?.kind === "category" ? selItem.node : null;
      if (!selItem) break;
    }
    return cols;
  }, [catalog, path]);

  const selectedCourse = useMemo(() => {
    const last = columns[columns.length - 1];
    const it = last.items.find((x) => itemId(x) === last.selected);
    return it?.kind === "course" ? it.course : null;
  }, [columns]);
  const byId = useMemo(() => {
    const m = new Map<string, CourseSummary>();
    const walk = (c: Category) => { c.courses.forEach((x) => m.set(x.id, x)); c.children.forEach(walk); };
    walk(catalog);
    return m;
  }, [catalog]);

  const select = useCallback((col: number, it: Item) => setPath([...path.slice(0, col), itemId(it)]), [path, setPath]);
  const jump = useCallback((id: string) => { const p = pathTo(catalog, id); if (p) setPath(p); }, [catalog, setPath]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      const depth = Math.max(0, Math.min(path.length - 1, columns.length - 1));
      const col = columns[depth];
      const idx = col.items.findIndex((it) => itemId(it) === col.selected);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.max(0, Math.min(col.items.length - 1, idx + (e.key === "ArrowDown" ? 1 : -1)));
        select(depth, col.items[next]);
      } else if (e.key === "ArrowRight") {
        const nextCol = columns[depth + 1];
        if (nextCol?.items.length) { e.preventDefault(); select(depth + 1, nextCol.items[0]); }
      } else if (e.key === "ArrowLeft") {
        if (depth > 0) { e.preventDefault(); setPath(path.slice(0, depth)); }
      } else if (e.key === "Enter" && selectedCourse) {
        e.preventDefault();
        onOpen(selectedCourse.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [columns, path, select, setPath, selectedCourse, onOpen]);

  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { scroller.current?.scrollTo({ left: scroller.current.scrollWidth, behavior: "smooth" }); }, [columns.length, selectedCourse]);

  return (
    <div className="columns" ref={scroller}>
      {columns.map((col, i) => (
        <ul key={i} className="column" role="listbox" aria-label={i === 0 ? "Catalog" : undefined}>
          {col.items.map((it) => {
            const id = itemId(it);
            const on = id === col.selected;
            if (it.kind === "category") {
              return (
                <li key={id} role="option" aria-selected={on} className={`row category ${on ? "on" : ""}`} onClick={() => select(i, it)}>
                  <span className="row-title">{it.node.label}</span>
                  <span className="row-meta">{it.count}<span className="chev">›</span></span>
                </li>
              );
            }
            const empty = it.course.count === 0;
            return (
              <li key={id} role="option" aria-selected={on} className={`row course ${empty ? "empty" : "filled"} ${on ? "on" : ""}`}
                onClick={() => select(i, it)} onDoubleClick={() => onOpen(it.course.id)}>
                <span className="row-title">{it.course.title}</span>
                <span className="row-meta">{empty ? "empty" : it.course.count}</span>
              </li>
            );
          })}
        </ul>
      ))}
      {selectedCourse && (
        <section className="column detail">
          <h2>{selectedCourse.title}</h2>
          <p className="detail-tagline">{selectedCourse.tagline}</p>
          <p className="detail-count">{selectedCourse.count === 0 ? "No lessons yet. Written when it is needed." : `${selectedCourse.count} lessons`}</p>
          {selectedCourse.related.length > 0 && (
            <div className="detail-related">
              <p className="muted">See also</p>
              <ul>
                {selectedCourse.related.map((id) => {
                  const r = byId.get(id);
                  if (!r) return null;
                  return (
                    <li key={id}>
                      <button className={`link ${r.count === 0 ? "empty" : ""}`} onClick={() => jump(id)}>{r.title}</button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <button className="next" onClick={() => onOpen(selectedCourse.id)}>
            {selectedCourse.count === 0 ? "Open entry" : "Open course"}<kbd>Enter</kbd>
          </button>
        </section>
      )}
    </div>
  );
}
