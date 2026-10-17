// Tokenizes Go code with tree-sitter for syntax coloring. The wasm files are served from public/;
// if loading fails this returns no tokens and the page falls back to plain monospace.
import { Parser, Language, Query } from "web-tree-sitter";
import goHighlights from "tree-sitter-go/queries/highlights.scm?raw";

export interface Token {
  start: number;
  end: number;
  name: string; // capture name from highlights.scm: keyword | string | number | type | function | ...
}

let ready: Promise<{ parser: Parser; query: Query } | null> | null = null;

function load() {
  if (!ready) {
    ready = (async () => {
      try {
        await Parser.init({ locateFile: () => "/web-tree-sitter.wasm" });
        const lang = await Language.load("/tree-sitter-go.wasm");
        const parser = new Parser();
        parser.setLanguage(lang);
        return { parser, query: new Query(lang, goHighlights) };
      } catch (e) {
        console.warn("tree-sitter failed to load; code will not be colored", e);
        return null;
      }
    })();
  }
  return ready;
}

const TOP_LEVEL = /^(package|import|func|type|const|var)\b/;

// Snippets are not always whole files: statement-level code is wrapped in a function before parsing,
// then the positions are shifted back.
export async function tokenize(code: string): Promise<Token[]> {
  const ts = await load();
  if (!ts) return [];
  let src = code;
  let offset = 0;
  if (!TOP_LEVEL.test(code)) {
    const prefix = "package p\n\nfunc _() {\n";
    src = prefix + code + "\n}\n";
    offset = prefix.length;
  } else if (!code.startsWith("package")) {
    const prefix = "package p\n\n";
    src = prefix + code;
    offset = prefix.length;
  }
  const tree = ts.parser.parse(src);
  if (!tree) return [];
  const captures = ts.query.captures(tree.rootNode);
  const out: Token[] = [];
  for (const c of captures) {
    const start = c.node.startIndex - offset;
    const end = c.node.endIndex - offset;
    if (start < 0 || end > code.length || end <= start) continue;
    if (c.node.childCount > 0 && c.name !== "string") continue; // only leaves get colored; a string literal counts as one leaf
    out.push({ start, end, name: c.name.split(".")[0] });
  }
  tree.delete();
  // The same text can have several captures (an identifier is both variable and function);
  // by tree-sitter convention the earlier pattern in the file wins, so keep the first.
  out.sort((a, b) => a.start - b.start || b.end - a.end);
  const dedup: Token[] = [];
  for (const t of out) {
    const last = dedup[dedup.length - 1];
    if (last && t.start < last.end) continue;
    dedup.push(t);
  }
  return dedup;
}
