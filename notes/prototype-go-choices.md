# Prototype 1: go-choices

Location: `src/prototypes/go-choices/`. Go backend plus React/TypeScript frontend; the same binary also works as a terminal program.

## Why multiple choice

The official Tour of Go makes users write code by hand. We do not. We give the user **choices**: read a piece of code, read its intent, make a judgment. Because:

- It matches [thesis.md](thesis.md): the skill is reading and judging, not writing.
- It is easier to keep going. No compile errors, no environment setup, you start within seconds.
- The choices teach by themselves: the wrong ones are the common wrong intuitions, and seeing them is learning too.

## Shape of a lesson

Every lesson has: intent (what we want), code, question, choices, answer, explanation. Intent is the key field: it turns "is this code correct" into "is this code what we want".

## Lessons: 48, basics first, then reviews

**Basics (24 lessons, type=highlight, kind=basics).** A Go snippet with one part highlighted and three natural-language choices saying what that part is, syntax and semantics, one correct. Simple enough that someone who never saw Go guesses right more than 80% of the time. Covers variables, constants, functions, multiple results, structs, methods, pointers, errors, maps, slices, range, switch, defer, goroutines, channels, interfaces. Pairing and "pick the Rust translation" were both built and rejected; the whole site is single-choice.

**Reviews (24 lessons, type=review).** A senior engineer reviews production Go code written by an AI. The question is always "Your review?" and the first choice is always "Approve":

| kind | count | covers |
|---|---|---|
| syntax | 7 | comma-ok, usable zero values (Mutex), implicit interfaces, pointer methods on addressable values, errors as values, for-select loop, generic inference |
| trap | 6 | nil map, append overwrite, := shadowing, non-nil nil interface, range copy, defer in a loop |
| reading | 5 | wrapping io.Reader, worker pool, functional options, goroutine leak after timeout, table-driven test |
| convention | 6 | getter naming, error message style, ctx first, doc comments, early return, receiver naming |

Lesson rules live in `llm-agent/skills/tutorial-generation`. Every Go snippet passes a gofmt syntax check.

## Structure

- `lessons.json`: the lessons, embedded by Go, shared by CLI and web. Two types: highlight and review. A highlight lesson's `highlight` substring must occur exactly once in its code; checked at load time.
- `main.go`: terminal mode. `lessons.go`: loading and validation.
- `server.go`: `GET /api/lessons` (no answers), `POST /api/answer` (sends a choice; the server grades and returns only correct or not, plus the explanation on a correct pick), and serves `web/dist`.
- `web/`: Vite + React + TypeScript. Code blocks are colored with web-tree-sitter + tree-sitter-go (wasm copied from node_modules into `public/`), using the grammar's own highlights.scm. `src/App.tsx` is one page: sidebar with contents, progress and theme switch; lesson area with code on the left and choices on the right. Picks can be changed until the right one lands; a few seconds after that the next lesson opens on its own.
- Colors are GitHub Primer, light and dark, selectable in the sidebar (Light / Dark / System, stored in localStorage).

Answers and explanations are never sent ahead; the server grades.

## Running

Terminal:

```sh
cd src/prototypes/go-choices
go run .               # all lessons
go run . -list         # list lessons
go run . -lesson nil-map
```

Web:

```sh
cd src/prototypes/go-choices/web && npm install && npm run build
cd .. && go run . -serve localhost:8080     # open http://localhost:8080
```

For frontend work run `npm run dev` in another terminal; Vite proxies `/api` to 8080.

## Possible next steps

- Show the consequence of a wrong approval: for instance, after approving defer-eval, a production log full of zero durations.
- Ask the learner to type one line of reasoning after picking, and record it, so the format does not degenerate into guessing.
- Compile-check the lessons: every snippet plus stubs must `go build`.
