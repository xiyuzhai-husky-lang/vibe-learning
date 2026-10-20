---
name: ui
description: Design rules for vibe-learning's learner-facing UI and exercise presentation (atomic code snippets with a highlighted part, single-choice, Go + React/TypeScript). Load before building or changing any page, component, lesson layout, theme, or choice/answer presentation in this repo.
---

# The vibe-learning UI

Read `notes/thesis.md` first. Every UI decision must trace back to it.

## Language

Everything the learner sees is English. So is every file in this repo (notes, skills, comments).

## What this is

A **reading desk**, not an exam and not a Duolingo-style app. The learner reads one atomic snippet at a time and says what the highlighted part is. The interface should feel like a code viewer with a question beside it, not a quiz show.

## Courses: an encyclopedia, organised as a tree

Set by the user on 2026-10-19. There are tons of courses, most of them empty, organised as a tree of categories (languages by family, codebases by domain, tools) with cross-links between entries.

- The root page is the table of contents of the whole tree, as **Miller columns** (chosen by the user on 2026-10-19 from the entrance candidates: "explorer but left to right gradual expansion like menus"). The first column lists the top-level branches; selecting a row opens the next column to its right with that node's children; columns past the selection are dropped. A selected entry gets a last column with its title, tagline, lesson count or "empty", its see-also links (clicking one walks the columns to that entry), and an Open button. Keyboard: up/down within a column, right/left between columns, Enter opens. Every entry is listed, filled entries bold with their count, empty entries muted with "empty". Nothing is hidden because it is empty. The last selection is remembered per device so the page reopens where the reader was. The page is left-aligned with a small left margin, not centered (user, 2026-10-19: "make it to the left, like little left margin"): columns grow to the right, so the first column sits near the left edge.
- Each course lives at `/<course-id>`. Its page shows its path in the tree (breadcrumb), its "See also" links (the `related` courses), then the lessons. An empty course still gets a page: title, tagline, breadcrumb, see-also, and the line "No lessons yet."
- The sidebar names the course, links back to the table of contents, and groups the lessons by kind. Codebase lessons show the file path in a small monospace label directly above the code. Nothing else differs between course types.
- Filling a course with a new language means also installing its tree-sitter grammar (wasm into `web/public/`, queries into `highlight.ts`); until then its code renders plain, never broken.

## Design candidates are demoed as tabs

Set by the user on 2026-10-19 ("demo tabs for entrance design"). When a page's design is open, build the candidates inside the app as tabs on one demo route (`/demo/<page>`, e.g. `/demo/entrance`), each rendering the real data with the real theme, with a one-line note on what the candidate is. The user compares them in place and picks; the winner replaces the page and the demo route is removed. Screenshots of every tab go in the report.

## Graph views of the catalog

Set by the user on 2026-10-19 ("the UI that is a bunch of balls, you click one and it shows more connected to it"; "give me 10 different force-directed graph"). The catalog is also drawn as a force-directed graph: balls are entries, links are category membership (solid) and see-also (dashed); languages blue, codebases purple; filled ball = has lessons, hollow = empty. The engine is `web/src/Graph.tsx` (d3-force, plain SVG, drag, pan, zoom, hover dims non-neighbours, layout settled before first paint). Ten candidate views live as tabs at `/demo/graph`: everything, wonder wheel (click to expand), recenter (Visual Thesaurus), web (see-also only), clusters, rings, bubbles, Obsidian, layers, plex (TheBrain). Any new view is a configure function for the forces plus a node/link subset. After seeing all ten the user said "go back to previous" (2026-10-19): the graphs are set aside, the entrance is chosen among the list candidates at `/demo/entrance`. Do not propose a graph entrance again unless asked.

## User data is local and never in git

Set by the user on 2026-10-19 ("keep user interaction user data out of the git repo", "make them local", "mkdir .local and gitignore it"). Progress (which lessons were answered, first-try results) is stored by the server in `.local/` at the repository root, which is gitignored; `-data` overrides the directory. The browser keeps only per-device conveniences (theme) in localStorage. Nothing a learner does is ever written into a tracked file.

## Lesson content

How lessons are written belongs to the `tutorial-generation` skill. The UI only needs to know: a lesson has a feature group (`kind`), a title, code, a highlighted substring, one fixed question, three one-line choices, and a one-sentence explanation. The sidebar groups lessons by feature group, so it reads like a table of contents of the language.

## Single-choice only

The whole product has one interaction: read code, click one option. No pairing, dragging, connecting, fill-in, or writing code. A pairing UI was built and rejected on 2026-10-16 ("this is stupidity"): too much interaction.

## Code presentation

- Every code block is syntax-highlighted with tree-sitter in the browser (web-tree-sitter plus one wasm grammar per language: go, cpp, python; queries from each grammar's own highlights.scm, with C's queries prepended for C++). Grammars load lazily per language. No regex highlighters. If the wasm fails to load, the block degrades to plain monospace and the page still works.
- A lesson's `highlight` substring is marked with a background tint (`<mark>`), with syntax colors on top. That tint is the only emphasis block on the page.
- Choices are natural language in the body font; monospace only when a choice itself is code.

## Theme

- Theme is configurable: a control in the sidebar with Light / Dark / System. The choice is stored in `localStorage` and applied as `data-theme` on `<html>`. System follows `prefers-color-scheme`.
- Default is **light**, including the code block: light background with a thin border, like a code-review tool. The user rejected a dark code panel on a light page on 2026-10-16 ("the theme is too dark"). Never put a dark panel inside the light theme.
- All colors are CSS variables on `:root`; the dark set lives under `:root[data-theme="dark"]` and under `prefers-color-scheme: dark` guarded by `:root:not([data-theme="light"])`.
- **Contrast is a hard rule.** Every text color must reach at least 4.5:1 against the background it actually sits on, syntax tokens included. Token colors are defined per theme for the code background of that theme; never reuse light-theme token colors on a dark code block (that happened on 2026-10-16: the user "can't see clearly many characters"). Do not invent a palette. Copy GitHub's exactly (light: Primer light; dark: Primer dark), page colors and syntax colors alike. The user's words on 2026-10-16: "can't you make it normal??? YOU JUST COPY FROM SOMEWHERE". Normal means: looks like GitHub's code view.
- Page and panels are neutral (white / near-white, or near-black), not tinted beige. Code is at least 14px.

## Lesson layout: left and right

Set by the user on 2026-10-16 ("left vs right ... one can always change the selection ... auto go to next one").

- Two columns. **Left**: lesson label, title, the code, and, after a miss, the verdict and explanation. **Right**: the choices, stacked. On narrow screens the right column moves below the left.
- **Right pick: go straight to the next lesson.** No countdown, no explanation, nothing to click. Set by the user on 2026-10-18 ("for correct answer, directly go to next"). The explanation is for people who missed; someone who got it right has nothing to read.
- **Wrong pick: the lesson stays, with a Next button.** The pick turns red, the left side shows "Not quite." followed by the explanation in the same block, and a Next button (also Enter) moves on. Choices stay open, so the learner may still pick the right one, which turns green and shows "Correct." in place, but it never auto-advances after a miss.
- The server returns the explanation with every graded pick, never the answer index.
- Score: a lesson counts as correct when the first pick was right; a lesson solved after misses shows as missed in the sidebar and summary.

## Lessons without code

Codebase lessons ask about the architecture and carry no code. The first lesson of a group opens with a `context` paragraph in a soft panel (the map of that aspect, read before answering); then the question sits on the left under the title in larger text, the right column shows only the choices under "Pick one". When a lesson has code as evidence, the layout is the snippet layout (file path, code, question on the right). After a pick, the explanation is followed by a muted monospace line "See path, path" naming the files the fact rests on, so the learner can verify it.

## Figures

A lesson's `figure` (inline SVG from the server, our own content) renders in the left column between the context and the question, in a soft panel, scaled to the column width, colored by the page's CSS variables so it follows the theme.

## Hard presentation rules

1. Choices are shown verbatim, one per line, no decoration beyond the number.
2. Verdict and explanation are one block: "Correct." followed directly by the explanation. Never two blocks.
3. Wrong picks stay marked red; the correct pick is marked green.

## Page structure

- Code is the main element and takes the most space. Choices are to the right, visible without scrolling.
- Table of contents and progress live in a quiet sidebar.
- Only the explanation block gets a container; everything else is layered by whitespace. Not everything is a card.

## Visual

- Feels like a tool, like a code viewer, not Duolingo. No confetti, stars, progress animations, or encouragement.
- Two typefaces: one for text, one monospace for code. Body 15 to 16px, line height 1.6, measure under about 70 characters.
- Three semantic colors only: correct (green), wrong (red), accent (one). Everything else is gray scale.
- Never: all-caps eyebrow labels, `A · B · C` metadata, `→` after text, entrance animations on every block.

## Interaction

- Keyboard: number keys pick (and re-pick), Enter goes to the next lesson after a miss.
- Feedback is inline on the left. No modals.
- Answers and explanations are never sent to the client ahead of time; the server grades.

## Copy

- Declarative short sentences, no exclamation marks. Error messages say what happened and what to do.

## Tech

- React + TypeScript + Vite, no UI framework. One CSS file with variables.
- Lessons live in `lessons.json`, embedded by Go, shared by CLI and web.

## After a change

1. `npm run build`, then `go run . -serve localhost:8080`.
2. Screenshot with headless Chrome in the initial state; if clicking is possible, also the answered state. Check both themes.
3. Walk the hard rules above, especially choice length and redundancy.
