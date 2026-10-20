# Prototype 1: reader

`src/prototypes/reader/`: Go backend, React/TypeScript frontend, one binary that also runs in the terminal. This note holds the design decisions. Counts, lists and status come from the repo (`go run . -catalog`), never from here.

## Why multiple choice

The official Tour of Go makes users write code. We give choices: read, judge. It matches [thesis.md](thesis.md), it keeps the learner moving (no compiler, no setup), and the wrong choices teach too: they are the common wrong intuitions.

## Two kinds of course

- **A language**: every feature, one atomic snippet at a time; one highlighted part; "What is the highlighted part?"; three plain-language choices; guessable by someone who never saw the language.
- **A codebase**: its architecture. Parts and boundaries, flows, state and memory, invariants and design decisions, failure and operations, where a change belongs. Questions in plain words; code only as evidence. Reading snippets and guessing their purpose was tried and rejected (2026-10-19): it tests unimportant details.

Rejected on the way for languages: pairing games, translation picking, syntax/trap/convention reviews (checkers, provers and AI make them trivial), checking code against a ticket (CNL will make intent mechanical).

Lesson rules live in `llm-agent/skills/tutorial-generation`.

## The catalog is an encyclopedia

A tree with tons of entries, most empty until needed, connected by see-also links. The directory tree under `courses/` is the catalog: a directory with `course.json` is an entry, any other directory is a category with `category.json`. `lessons.json` is optional. `related` names the entries to see next. To add an entry, make the directory; to fill one, write its lessons by the skill and add its tree-sitter grammar.

## The entrance

Miller columns: the first column lists the branches, selecting a row opens the next column, the last column is the entry with its see-also links and an Open button. Chosen over cards, tabs, an index, an outline and ten force-directed graphs (all still at `/demo/entrance` and `/demo/graph` until they are no longer wanted).

## Learner data

Kept by the server in `.local/` at the repository root, gitignored (`-data` overrides). The browser keeps only the theme.

## Structure

- `courses/`: the catalog, embedded by Go, shared by CLI and web; validated at load (kinds declared, answer in range, highlight occurs once, related ids exist).
- `lessons.go` loading, `server.go` HTTP API (the server grades; answers never leave it), `progress.go` learner data, `main.go` terminal mode and flags.
- `web/`: Vite + React + TypeScript; web-tree-sitter with one wasm grammar per language; GitHub Primer colors, light and dark; `Columns.tsx` is the entrance, `App.tsx` the course view.

## Running

```sh
cd src/prototypes/reader/web && npm install && npm run build
cd .. && go run . -serve localhost:8080     # http://localhost:8080
go run . -catalog                           # the tree, in the terminal
go run . -course go                         # a course, in the terminal
```

For frontend work run `npm run dev`; Vite proxies `/api` to 8080.
