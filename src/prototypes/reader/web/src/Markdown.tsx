import { useMemo } from "react";
import { marked, type TokenizerAndRendererExtension } from "marked";
import katex from "katex";
import "katex/dist/katex.min.css";

// Readings are our own Markdown, served with inline SVG figures already in place.
// Math is written as $...$ and $$...$$ and typeset by KaTeX.

const blockMath: TokenizerAndRendererExtension = {
  name: "blockMath",
  level: "block",
  start: (src) => src.indexOf("$$"),
  tokenizer(src) {
    const m = /^\$\$([\s\S]+?)\$\$/.exec(src);
    if (m) return { type: "blockMath", raw: m[0], text: m[1].trim() };
  },
  renderer: (token) => `<p class="math">${katex.renderToString(token.text as string, { displayMode: true, throwOnError: false })}</p>`,
};

const inlineMath: TokenizerAndRendererExtension = {
  name: "inlineMath",
  level: "inline",
  start: (src) => src.indexOf("$"),
  tokenizer(src) {
    const m = /^\$([^$\n]+?)\$/.exec(src);
    if (m) return { type: "inlineMath", raw: m[0], text: m[1] };
  },
  renderer: (token) => katex.renderToString(token.text as string, { throwOnError: false }),
};

marked.use({ extensions: [blockMath, inlineMath] });

export function Markdown({ source }: { source: string }) {
  const html = useMemo(() => marked.parse(source, { async: false }) as string, [source]);
  return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
