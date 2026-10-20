import { useEffect, useState, type ReactNode } from "react";
import { fetchCatalog, type Category, type CourseSummary } from "./api";
import { CategoryView, countCourses, flatten } from "./Catalog";
import { Columns } from "./Columns";

// Candidate designs for the entrance (the table of contents), shown side by side as tabs so one
// can be picked. Every candidate renders the real catalog. Lives at /demo/entrance.

type Open = (id: string) => void;
interface Variant { id: string; label: string; note: string; render: (cat: Category, open: Open) => ReactNode }

const VARIANTS: Variant[] = [
  { id: "columns", label: "Columns", note: "The chosen one: Miller columns, left to right like cascading menus; the last column is the entry.",
    render: (cat, open) => <Columns catalog={cat} onOpen={open} /> },
  { id: "cards", label: "Cards", note: "The current entrance: nested headings, entries as boxed cards, empty ones dashed.",
    render: (cat, open) => <>{cat.children.map((c) => <CategoryView key={c.id} category={c} depth={2} onOpen={open} />)}</> },
  { id: "tabs", label: "Tabs", note: "One tab per top-level branch; subcategories as columns of plain links.",
    render: (cat, open) => <TabsVariant cat={cat} open={open} /> },
  { id: "index", label: "Index", note: "An encyclopedia index: dense text in columns, filled entries in bold with their count.",
    render: (cat, open) => <IndexVariant cat={cat} open={open} /> },
  { id: "outline", label: "Outline", note: "A collapsible tree, one row per entry, like a file explorer.",
    render: (cat, open) => <OutlineVariant cat={cat} open={open} /> },
  { id: "explorer", label: "Explorer", note: "Categories on the left, the selected category's entries with taglines on the right.",
    render: (cat, open) => <ExplorerVariant cat={cat} open={open} /> },
];

export function EntranceDemo({ onOpen }: { onOpen: Open }) {
  const [catalog, setCatalog] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [which, setWhich] = useState(() => VARIANTS.find((v) => v.id === window.location.hash.slice(1))?.id ?? VARIANTS[0].id);
  useEffect(() => { fetchCatalog().then(setCatalog).catch((e) => setError(String(e))); }, []);
  useEffect(() => { window.history.replaceState(null, "", `#${which}`); }, [which]);
  if (error) return <main className="shell"><p className="error">{error}</p></main>;
  if (!catalog) return <main className="shell"><p className="muted">Loading…</p></main>;
  const v = VARIANTS.find((x) => x.id === which)!;
  return (
    <main className="shell demo">
      <p className="eyebrow">Demo: entrance designs</p>
      <div className="demo-tabs" role="tablist">
        {VARIANTS.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === which} className={x.id === which ? "on" : ""} onClick={() => setWhich(x.id)}>{x.label}</button>
        ))}
      </div>
      <p className="muted demo-note">{v.note}</p>
      <div className="demo-stage">
        <h1 className="brand">Read</h1>
        <p className="tagline">Learn languages, papers and codebases by reading and judging.</p>
        {v.render(catalog, onOpen)}
      </div>
    </main>
  );
}

function Link({ c, open, className = "" }: { c: CourseSummary; open: Open; className?: string }) {
  return (
    <a href={`/${c.id}`} className={`${className} ${c.count === 0 ? "empty" : "filled"}`} onClick={(e) => { e.preventDefault(); open(c.id); }}>
      {c.title}
    </a>
  );
}

// Tabs: Languages | Codebases, then subcategories as columns.
function TabsVariant({ cat, open }: { cat: Category; open: Open }) {
  const [top, setTop] = useState(cat.children[0]?.id);
  const branch = cat.children.find((c) => c.id === top) ?? cat.children[0];
  return (
    <>
      <div className="v-tabs">
        {cat.children.map((c) => (
          <button key={c.id} className={c.id === branch.id ? "on" : ""} onClick={() => setTop(c.id)}>
            {c.label} <span className="muted">{countCourses(c)}</span>
          </button>
        ))}
      </div>
      <div className="v-columns">
        {branch.children.map((sub) => (
          <section key={sub.id} className="v-col">
            <h3>{sub.label}</h3>
            <ul>
              {sub.courses.map((c) => (
                <li key={c.id}><Link c={c} open={open} />{c.count > 0 && <span className="count">{c.count}</span>}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

// Index: dense inline links separated by dots, in CSS columns.
function IndexVariant({ cat, open }: { cat: Category; open: Open }) {
  return (
    <div className="v-index">
      {cat.children.map((branch) => (
        <section key={branch.id} className="v-index-branch">
          <h2>{branch.label}</h2>
          <div className="v-index-cols">
            {branch.children.map((sub) => (
              <p key={sub.id}>
                <span className="v-index-head">{sub.label}</span>
                {sub.courses.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && <span className="sep-dot"> · </span>}
                    <Link c={c} open={open} />
                    {c.count > 0 && <sup>{c.count}</sup>}
                  </span>
                ))}
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// Outline: collapsible tree with one row per entry.
function OutlineVariant({ cat, open }: { cat: Category; open: Open }) {
  const node = (c: Category, depth: number): ReactNode => (
    <details key={c.id} open className="v-node">
      <summary>{c.label} <span className="muted">{countCourses(c)}</span></summary>
      <div className="v-children">
        {c.courses.map((x) => (
          <div key={x.id} className="v-row">
            <Link c={x} open={open} />
            <span className="count">{x.count === 0 ? "empty" : `${x.count} lessons`}</span>
          </div>
        ))}
        {c.children.map((ch) => node(ch, depth + 1))}
      </div>
    </details>
  );
  return <div className="v-outline">{cat.children.map((c) => node(c, 0))}</div>;
}

// Explorer: categories left, the selected one's entries right.
function ExplorerVariant({ cat, open }: { cat: Category; open: Open }) {
  const leaves = flatten(cat).filter((x) => x.cat.courses.length > 0);
  const [sel, setSel] = useState(leaves[0]?.cat.id);
  const cur = leaves.find((x) => x.cat.id === sel) ?? leaves[0];
  return (
    <div className="v-explorer">
      <nav className="v-nav">
        {flatten(cat).slice(1).map(({ cat: c, depth }) => (
          c.courses.length > 0
            ? <button key={c.id} className={`d${depth} ${c.id === cur.cat.id ? "on" : ""}`} onClick={() => setSel(c.id)}>{c.label}<span className="count">{countCourses(c)}</span></button>
            : <p key={c.id} className={`v-nav-head d${depth}`}>{c.label}</p>
        ))}
      </nav>
      <section className="v-pane">
        <h2>{cur.cat.label}</h2>
        <table>
          <tbody>
            {cur.cat.courses.map((c) => (
              <tr key={c.id} className={c.count === 0 ? "empty" : ""}>
                <td className="t-title"><Link c={c} open={open} /></td>
                <td className="t-tag">{c.tagline}</td>
                <td className="t-count">{c.count === 0 ? "empty" : `${c.count} lessons`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
