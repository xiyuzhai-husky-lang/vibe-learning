import { useEffect, useState } from "react";
import { tokenize, type Token } from "./highlight";

// Code block: tree-sitter coloring, plus an optional highlight substring wrapped in <mark>.
export function CodeBlock({ code, highlight }: { code: string; highlight?: string }) {
  const [tokens, setTokens] = useState<Token[]>([]);
  useEffect(() => {
    let alive = true;
    tokenize(code).then((t) => alive && setTokens(t));
    return () => { alive = false; };
  }, [code]);

  const hs = highlight ? code.indexOf(highlight) : -1;
  const he = hs >= 0 ? hs + highlight!.length : -1;

  // Cut points: every token boundary plus the highlight boundaries.
  const cuts = new Set<number>([0, code.length]);
  for (const t of tokens) { cuts.add(t.start); cuts.add(t.end); }
  if (hs >= 0) { cuts.add(hs); cuts.add(he); }
  const points = [...cuts].sort((a, b) => a - b);

  const parts: { text: string; name?: string; marked: boolean }[] = [];
  let ti = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const s = points[i], e = points[i + 1];
    while (ti < tokens.length && tokens[ti].end <= s) ti++;
    const tok = ti < tokens.length && tokens[ti].start <= s && tokens[ti].end >= e ? tokens[ti] : undefined;
    parts.push({ text: code.slice(s, e), name: tok?.name, marked: hs >= 0 && s >= hs && e <= he });
  }

  // Merge adjacent marked parts into one <mark> so the tint is not chopped up.
  const groups: { marked: boolean; parts: typeof parts }[] = [];
  for (const p of parts) {
    const g = groups[groups.length - 1];
    if (g && g.marked === p.marked) g.parts.push(p);
    else groups.push({ marked: p.marked, parts: [p] });
  }

  const render = (ps: typeof parts, keyBase: number) =>
    ps.map((p, i) => (p.name ? <span key={keyBase + i} className={`tok-${p.name}`}>{p.text}</span> : p.text));

  return (
    <pre className="code"><code>
      {groups.map((g, i) =>
        g.marked ? <mark key={i}>{render(g.parts, i * 1000)}</mark> : render(g.parts, i * 1000),
      )}
    </code></pre>
  );
}
