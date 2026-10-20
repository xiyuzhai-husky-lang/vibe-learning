// Tokenizes code with tree-sitter for syntax coloring. One wasm grammar per language, served from
// public/ and loaded lazily; if loading fails the page falls back to plain monospace.
import { Parser, Language, Query } from "web-tree-sitter";
import goHighlights from "tree-sitter-go/queries/highlights.scm?raw";
import cHighlights from "tree-sitter-c/queries/highlights.scm?raw";
import cppHighlights from "tree-sitter-cpp/queries/highlights.scm?raw";
import pythonHighlights from "tree-sitter-python/queries/highlights.scm?raw";

export interface Token {
  start: number;
  end: number;
  name: string; // capture name from highlights.scm: keyword | string | number | type | function | ...
}

interface Grammar {
  wasm: string;
  queries: string;
  // Wraps a statement-level snippet so it parses as a file; returns the source and the offset of the snippet.
  wrap: (code: string) => [string, number];
}

const GRAMMARS: Record<string, Grammar> = {
  go: {
    wasm: "/tree-sitter-go.wasm",
    queries: goHighlights,
    wrap: (code) => {
      if (/^(package|import|func|type|const|var)\b/.test(code)) {
        return code.startsWith("package") ? [code, 0] : ["package p\n\n" + code, 11];
      }
      const prefix = "package p\n\nfunc _() {\n";
      return [prefix + code + "\n}\n", prefix.length];
    },
  },
  // The C++ grammar is a superset of C; its highlight file only adds to C's, so both are used.
  cpp: { wasm: "/tree-sitter-cpp.wasm", queries: cHighlights + "\n" + cppHighlights, wrap: (code) => [code, 0] },
  python: { wasm: "/tree-sitter-python.wasm", queries: pythonHighlights, wrap: (code) => [code, 0] },
};

let runtime: Promise<boolean> | null = null;
const loaded = new Map<string, Promise<{ parser: Parser; query: Query } | null>>();

function initRuntime() {
  if (!runtime) {
    runtime = Parser.init({ locateFile: () => "/web-tree-sitter.wasm" }).then(() => true, (e) => {
      console.warn("tree-sitter failed to load; code will not be colored", e);
      return false;
    });
  }
  return runtime;
}

function load(language: string) {
  const g = GRAMMARS[language];
  if (!g) return Promise.resolve(null);
  if (!loaded.has(language)) {
    loaded.set(language, (async () => {
      if (!(await initRuntime())) return null;
      try {
        const lang = await Language.load(g.wasm);
        const parser = new Parser();
        parser.setLanguage(lang);
        let query: Query;
        try {
          query = new Query(lang, g.queries);
        } catch (e) {
          // A query file may reference nodes this grammar version lacks; fall back to the grammar's own file.
          console.warn(`highlight queries for ${language} failed, using the grammar's own`, e);
          query = new Query(lang, language === "cpp" ? cppHighlights : g.queries);
        }
        return { parser, query };
      } catch (e) {
        console.warn(`grammar ${language} failed to load; code will not be colored`, e);
        return null;
      }
    })());
  }
  return loaded.get(language)!;
}

export async function tokenize(code: string, language: string): Promise<Token[]> {
  const ts = await load(language);
  const g = GRAMMARS[language];
  if (!ts || !g) return [];
  const [src, offset] = g.wrap(code);
  const tree = ts.parser.parse(src);
  if (!tree) return [];
  const captures = ts.query.captures(tree.rootNode);
  const out: Token[] = [];
  for (const c of captures) {
    const start = c.node.startIndex - offset;
    const end = c.node.endIndex - offset;
    if (start < 0 || end > code.length || end <= start) continue;
    if (c.node.childCount > 0 && c.name !== "string" && c.name !== "comment") continue; // leaves only; strings and comments count whole
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
