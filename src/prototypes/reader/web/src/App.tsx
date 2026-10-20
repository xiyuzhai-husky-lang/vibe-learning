import { useCallback, useEffect, useState } from "react";
import {
  fetchCatalog, fetchCourse, fetchProgress, resetProgress, submitChoice,
  type Category, type Course, type Lesson,
} from "./api";
import { CodeBlock } from "./CodeBlock";
import { countCourses } from "./Catalog";
import { Columns } from "./Columns";
import { EntranceDemo } from "./EntranceDemo";
import { GraphDemo } from "./GraphDemo";

// Per-lesson progress. Picks are never locked: wrong picks accumulate, and the right one may follow.
// The server keeps it in its local data directory; this is the client's copy.
interface Progress {
  wrong: number[]; // choices tried and rejected
  explanation?: string; // known after the first graded pick
  solved?: { choice: number };
}
const firstTry = (p: Progress) => !!p.solved && p.wrong.length === 0;

type Theme = "light" | "dark" | "system";
const THEMES: Theme[] = ["light", "dark", "system"];
const THEME_LABEL: Record<Theme, string> = { light: "Light", dark: "Dark", system: "System" };

function loadTheme(): Theme {
  try {
    const t = localStorage.getItem("theme");
    if (t === "light" || t === "dark" || t === "system") return t;
  } catch { /* storage unavailable */ }
  return "light";
}

function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t);
  try { localStorage.setItem("theme", t); } catch { /* storage unavailable */ }
}

function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(loadTheme);
  useEffect(() => applyTheme(theme), [theme]);
  return (
    <div className="theme" role="radiogroup" aria-label="Theme">
      {THEMES.map((t) => (
        <button key={t} className={t === theme ? "on" : ""} onClick={() => setTheme(t)} aria-checked={t === theme} role="radio">
          {THEME_LABEL[t]}
        </button>
      ))}
    </div>
  );
}

// Routing: "/" lists the courses, "/<course>" runs one. History API, no router library.
function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = useCallback((to: string) => {
    window.history.pushState(null, "", to);
    setPath(to);
  }, []);
  return { path, navigate };
}

export default function App() {
  const { path, navigate } = usePath();
  const courseID = path.replace(/^\/+|\/+$/g, "");
  if (!courseID) return <CourseList onOpen={(id) => navigate(`/${id}`)} />;
  if (courseID === "demo/entrance") return <EntranceDemo onOpen={(id) => navigate(`/${id}`)} />;
  if (courseID === "demo/graph") return <GraphDemo onOpen={(id) => navigate(`/${id}`)} />;
  return <CourseView key={courseID} id={courseID} onHome={() => navigate("/")} onOpen={(id) => navigate(`/${id}`)} />;
}

function CourseList({ onOpen }: { onOpen: (id: string) => void }) {
  const [catalog, setCatalog] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchCatalog().then(setCatalog).catch((e) => setError(String(e)));
  }, []);
  if (error) return <main className="shell"><p className="error">{error}</p></main>;
  if (!catalog) return <main className="shell"><p className="muted">Loading…</p></main>;
  const total = countCourses(catalog);
  const filled = countCourses(catalog, (c) => c.count > 0);
  return (
    <main className="shell home entrance">
      <h1 className="brand">Read</h1>
      <p className="tagline">Learn languages, papers and codebases by reading and judging.</p>
      <p className="muted">{total} entries, {filled} with lessons so far. The rest are written when they are needed.</p>
      <Columns catalog={catalog} onOpen={onOpen} />
      <ThemeSwitch />
    </main>
  );
}

function CourseView({ id, onHome, onOpen }: { id: string; onHome: () => void; onOpen: (id: string) => void }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([fetchCourse(id), fetchProgress(id)])
      .then(([c, saved]) => {
        const restored: Record<string, Progress> = {};
        for (const [lid, p] of Object.entries(saved)) {
          restored[lid] = { wrong: p.wrong, explanation: p.explanation, solved: p.solved === undefined ? undefined : { choice: p.solved } };
        }
        setProgress(restored);
        // ?lesson=<id> opens one lesson; otherwise resume at the first lesson not yet solved.
        const wanted = new URLSearchParams(window.location.search).get("lesson");
        const at = wanted ? c.lessons.findIndex((l) => l.id === wanted) : -1;
        const first = c.lessons.findIndex((l) => !restored[l.id]?.solved);
        setIndex(at >= 0 ? at : first < 0 ? c.lessons.length : first);
        setCourse(c);
      })
      .catch((e) => setError(String(e)));
  }, [id]);

  const restart = useCallback(async () => {
    try {
      await resetProgress(id);
      setProgress({});
      setIndex(0);
    } catch (e) {
      setError(String(e));
    }
  }, [id]);

  const lessons = course?.lessons;
  const lesson = lessons?.[index];

  const next = useCallback(() => setIndex((i) => i + 1), []);

  const pick = useCallback(async (choice: number) => {
    if (!lesson || busy) return;
    const cur = progress[lesson.id] ?? { wrong: [] };
    if (cur.solved || cur.wrong.includes(choice)) return;
    setBusy(true);
    try {
      const v = await submitChoice(id, lesson.id, choice);
      setProgress((prev) => {
        const p = prev[lesson.id] ?? { wrong: [] };
        return {
          ...prev,
          [lesson.id]: v.correct
            ? { ...p, explanation: v.explanation, solved: { choice } }
            : { ...p, explanation: v.explanation, wrong: [...p.wrong, choice] },
        };
      });
      // Right on the first try: nothing to read, go straight on.
      if (v.correct && cur.wrong.length === 0) next();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, [id, lesson, busy, progress, next]);

  if (error) return <main className="shell"><p className="error">{error}</p></main>;
  if (!course || !lessons) return <main className="shell"><p className="muted">Loading…</p></main>;

  const solved = Object.values(progress).filter((p) => p.solved).length;
  const clean = Object.values(progress).filter(firstTry).length;
  const finished = solved === lessons.length && index >= lessons.length;
  const kindLabel = (k: string) => course.kinds.find((x) => x.id === k)?.label ?? k;

  const header = (
    <>
      <nav className="crumbs">
        <a href="/" onClick={(e) => { e.preventDefault(); onHome(); }}>All courses</a>
        {course.path.map((p) => <span key={p.id}><span className="sep">/</span>{p.label}</span>)}
      </nav>
      <h1 className="brand">{course.title}</h1>
      <p className="tagline">{course.tagline}</p>
      {course.related.length > 0 && (
        <p className="related">
          <span className="muted">See also</span>
          {course.related.map((r) => (
            <a key={r.id} href={`/${r.id}`} className={r.count === 0 ? "empty" : ""} onClick={(e) => { e.preventDefault(); onOpen(r.id); }}>
              {r.title}
            </a>
          ))}
        </p>
      )}
    </>
  );

  if (lessons.length === 0) {
    return (
      <main className="shell home">
        {header}
        <p className="muted empty-note">No lessons yet. This entry is written when it is needed.</p>
        <ThemeSwitch />
      </main>
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        {header}
        {course.kinds.map((kind) => {
          const group = lessons.map((l, i) => [l, i] as const).filter(([l]) => l.kind === kind.id);
          if (group.length === 0) return null;
          return (
            <section key={kind.id} className="toc-group">
              <h2 className="toc-kind">{kind.label}</h2>
              <ol className="toc">
                {group.map(([l, i]) => {
                  const p = progress[l.id];
                  const state = p?.solved ? (firstTry(p) ? "ok" : "bad") : i === index ? "now" : "";
                  return (
                    <li key={l.id} className={`toc-item ${state}`}>
                      <button onClick={() => setIndex(i)}>
                        <span className="dot" />
                        {l.title}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
        <p className="score">
          {clean} of {solved} right first time, {lessons.length} lessons
        </p>
        <ThemeSwitch />
      </aside>

      <main className="shell">
        {finished || !lesson ? (
          <Summary lessons={lessons} progress={progress} onRestart={restart} />
        ) : (
          <LessonView
            key={lesson.id}
            lesson={lesson}
            kindLabel={kindLabel(lesson.kind)}
            n={index + 1}
            total={lessons.length}
            progress={progress[lesson.id] ?? { wrong: [] }}
            busy={busy}
            onPick={pick}
            onNext={next}
          />
        )}
      </main>
    </div>
  );
}

function LessonView(props: {
  lesson: Lesson;
  kindLabel: string;
  n: number;
  total: number;
  progress: Progress;
  busy: boolean;
  onPick: (i: number) => void;
  onNext: () => void;
}) {
  const { lesson, kindLabel, n, total, progress, busy, onPick, onNext } = props;
  const solved = progress.solved;
  const missed = progress.wrong.length > 0;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = Number(e.key);
      if (k >= 1 && k <= lesson.choices.length) onPick(k - 1);
      else if (missed && e.key === "Enter") onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lesson, missed, onPick, onNext]);

  return (
    <article className="lesson">
      <div className="left">
        <p className="eyebrow">{kindLabel} {n}/{total}</p>
        <h2>{lesson.title}</h2>
        {lesson.code ? (
          <>
            {lesson.file && <p className="file">{lesson.file}</p>}
            <CodeBlock code={lesson.code} highlight={lesson.highlight} language={lesson.language} />
          </>
        ) : (
          <>
            {lesson.context && <p className="context">{lesson.context}</p>}
            {lesson.figure && <div className="figure" dangerouslySetInnerHTML={{ __html: lesson.figure }} />}
            <p className="prompt">{lesson.question}</p>
          </>
        )}

        {missed && (
          <section className={`verdict ${solved ? "ok" : "bad"}`}>
            <p className="explanation"><strong>{solved ? "Correct." : "Not quite."}</strong>{progress.explanation}</p>
            {lesson.files && lesson.files.length > 0 && <p className="files">See {lesson.files.join(", ")}</p>}
            <button className="next" onClick={onNext}>
              {n === total ? "Summary" : "Next"}<kbd>Enter</kbd>
            </button>
          </section>
        )}
      </div>

      <div className="right">
        <p className="question">{lesson.code ? lesson.question : "Pick one"}</p>
        <ol className="choices">
          {lesson.choices.map((c, i) => {
            let cls = "choice";
            if (solved?.choice === i) cls += " correct";
            else if (progress.wrong.includes(i)) cls += " wrong";
            else if (solved) cls += " dim";
            return (
              <li key={i}>
                <button className={cls} disabled={busy || !!solved || progress.wrong.includes(i)} onClick={() => onPick(i)}>
                  <span className="num">{i + 1}</span>
                  <span>{c}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </article>
  );
}

function Summary(props: { lessons: Lesson[]; progress: Record<string, Progress>; onRestart: () => void }) {
  const { lessons, progress, onRestart } = props;
  const clean = lessons.filter((l) => progress[l.id] && firstTry(progress[l.id])).length;
  return (
    <article className="lesson">
      <div className="left">
        <p className="eyebrow">Summary</p>
        <h2>{clean} of {lessons.length} right first time</h2>
        <ul className="recap">
          {lessons.map((l) => {
            const p = progress[l.id];
            const ok = p && firstTry(p);
            return (
              <li key={l.id} className={ok ? "ok" : "bad"}>
                <span className="dot" />
                {l.title}
                {!ok && p && <span className="muted"> ({p.wrong.length} {p.wrong.length === 1 ? "miss" : "misses"})</span>}
              </li>
            );
          })}
        </ul>
        <button className="next" onClick={onRestart}>Start over</button>
      </div>
    </article>
  );
}
