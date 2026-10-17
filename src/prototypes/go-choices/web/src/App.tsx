import { useCallback, useEffect, useState } from "react";
import { fetchLessons, submitChoice, KIND_LABEL, type ChoiceLesson, type Kind, type Lesson } from "./api";
import { CodeBlock } from "./CodeBlock";

const KIND_ORDER: Kind[] = ["basics", "syntax", "trap", "reading", "convention"];
const AUTO_NEXT_SECONDS = 4;

// Per-lesson progress. Picks are never locked: wrong picks accumulate until the right one lands.
interface Progress {
  wrong: number[]; // choices tried and rejected
  solved?: { choice: number; explanation: string };
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

export default function App() {
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchLessons().then(setLessons).catch((e) => setError(String(e)));
  }, []);

  const lesson = lessons?.[index];

  const pick = useCallback(async (choice: number) => {
    if (!lesson || busy) return;
    const cur = progress[lesson.id] ?? { wrong: [] };
    if (cur.solved || cur.wrong.includes(choice)) return;
    setBusy(true);
    try {
      const v = await submitChoice(lesson.id, choice);
      setProgress((prev) => {
        const p = prev[lesson.id] ?? { wrong: [] };
        return {
          ...prev,
          [lesson.id]: v.correct
            ? { ...p, solved: { choice, explanation: v.explanation ?? "" } }
            : { ...p, wrong: [...p.wrong, choice] },
        };
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, [lesson, busy, progress]);

  const next = useCallback(() => setIndex((i) => i + 1), []);

  if (error) return <main className="shell"><p className="error">{error}</p></main>;
  if (!lessons) return <main className="shell"><p className="muted">Loading…</p></main>;

  const solved = Object.values(progress).filter((p) => p.solved).length;
  const clean = Object.values(progress).filter(firstTry).length;
  const finished = solved === lessons.length && index >= lessons.length;

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1 className="brand">Read Go</h1>
        <p className="tagline">Guess the syntax, then review production code like a senior engineer.</p>
        {KIND_ORDER.map((kind) => {
          const group = lessons.map((l, i) => [l, i] as const).filter(([l]) => l.kind === kind);
          if (group.length === 0) return null;
          return (
            <section key={kind} className="toc-group">
              <h2 className="toc-kind">{KIND_LABEL[kind]}</h2>
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
          <Summary lessons={lessons} progress={progress} onRestart={() => { setProgress({}); setIndex(0); }} />
        ) : (
          <LessonView
            key={lesson.id}
            lesson={lesson}
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
  lesson: ChoiceLesson;
  n: number;
  total: number;
  progress: Progress;
  busy: boolean;
  onPick: (i: number) => void;
  onNext: () => void;
}) {
  const { lesson, n, total, progress, busy, onPick, onNext } = props;
  const solved = progress.solved;
  const lastWrong = progress.wrong[progress.wrong.length - 1];

  // Auto-advance a few seconds after the right pick. Unmounting (navigating away) cancels it.
  const [left, setLeft] = useState(AUTO_NEXT_SECONDS);
  useEffect(() => {
    if (!solved) return;
    setLeft(AUTO_NEXT_SECONDS);
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [solved]);
  useEffect(() => {
    if (solved && left <= 0) onNext();
  }, [solved, left, onNext]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = Number(e.key);
      if (k >= 1 && k <= lesson.choices.length) onPick(k - 1);
      else if (solved && e.key === "Enter") onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lesson, solved, onPick, onNext]);

  return (
    <article className="lesson">
      <div className="left">
        <p className="eyebrow">{KIND_LABEL[lesson.kind]} {n}/{total}</p>
        <h2>{lesson.title}</h2>

        {lesson.note && (
          <section className="intent">
            <span className="label">PR notes</span>
            <p>{lesson.note}</p>
          </section>
        )}

        <CodeBlock code={lesson.code} highlight={lesson.highlight} />

        {solved ? (
          <section className="verdict ok">
            <p className="explanation"><strong>Correct.</strong>{solved.explanation}</p>
            <button className="next" onClick={onNext}>
              {n === total ? "Summary" : `Next in ${Math.max(left, 0)}s`}<kbd>Enter</kbd>
            </button>
          </section>
        ) : lastWrong !== undefined ? (
          <section className="verdict bad">
            <p className="explanation"><strong>Not quite.</strong>Pick again.</p>
          </section>
        ) : null}
      </div>

      <div className="right">
        <p className="question">{lesson.question}</p>
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
