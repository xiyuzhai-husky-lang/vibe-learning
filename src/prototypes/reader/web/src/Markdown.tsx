import { useMemo } from "react";
import { marked } from "marked";
import katex from "katex";
import "katex/dist/katex.min.css";

// Readings are our own Markdown, served with inline SVG figures already in place.
// Math is written as $...$ and $$...$$ and typeset by KaTeX. The math is lifted out before
// Markdown runs, so that asterisks and underscores inside formulas are never read as emphasis.

function render(source: string): string {
  const math: string[] = [];
  const keep = (tex: string, display: boolean) => {
    math.push(katex.renderToString(tex, { displayMode: display, throwOnError: false }));
    return `MATHSPAN${math.length - 1}X`;
  };
  const lifted = source
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => `\n\n${keep(tex.trim(), true)}\n\n`)
    .replace(/\$([^$\n]+?)\$/g, (_, tex: string) => keep(tex, false));
  const html = marked.parse(lifted, { async: false }) as string;
  return html.replace(/MATHSPAN(\d+)X/g, (_, i: string) => math[Number(i)]);
}

export function Markdown({ source }: { source: string }) {
  const html = useMemo(() => render(source), [source]);
  return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
