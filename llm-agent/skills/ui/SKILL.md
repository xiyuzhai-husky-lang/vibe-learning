---
name: ui
description: Design rules for vibe-learning's learner-facing UI and exercise presentation (code-review-style learning, Go + React/TypeScript). Load before building or changing any page, component, lesson layout, theme, or choice/answer presentation in this repo.
---

# The vibe-learning UI

Read `notes/thesis.md` first. Every UI decision must trace back to it.

## Language

Everything the learner sees is English. So is every file in this repo (notes, skills, comments).

## What this is

A **review desk**, not an exam and not a language-learning app. The learner is the reviewer; the code was written by an AI or a colleague. The interface should feel like making a judgment, not answering a quiz.

## Lesson content

How lessons are written belongs to the `tutorial-generation` skill. The UI only needs to know: a lesson has optional PR notes, code, an optional highlighted substring, one fixed question, 2 to 4 one-line choices, and an explanation. Wording follows code-review tools: PR notes, approve, request changes.

## Single-choice only

The whole product has one interaction: read code, click one option. No pairing, dragging, connecting, fill-in, or writing code. A pairing UI was built and rejected on 2026-10-16 ("this is stupidity"): too much interaction.

## Code presentation

- Every code block is syntax-highlighted with tree-sitter in the browser (web-tree-sitter + the tree-sitter-go wasm, queries from the grammar's own highlights.scm). No regex highlighters. If the wasm fails to load, the block degrades to plain monospace and the page still works.
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

- Two columns. **Left**: lesson label, title, PR notes, the code, and, once answered, the verdict and explanation. **Right**: the choices, stacked. On narrow screens the right column moves below the left.
- **The selection can always be changed.** Choices are never locked. Every pick is graded at once: a wrong pick turns red and the left side says "Not quite." in one line, without the explanation, so the learner can pick again. The right pick turns green and the left side shows "Correct." followed by the explanation in the same block.
- **Auto-advance.** A few seconds (about 4) after the right pick, the next lesson opens on its own. The left side shows "Next in 4s" counting down, and a Next button or Enter goes at once. Navigating anywhere else cancels the timer.
- The server never sends the answer index or the explanation on a wrong pick; it only says correct or not. The explanation comes back with the correct pick.
- Score: a lesson counts as correct when the first pick was right; a lesson solved after misses shows as missed in the sidebar and summary.

## Hard presentation rules

1. Choices are shown verbatim, one per line, no decoration beyond the number.
2. Verdict and explanation are one block: "Correct." followed directly by the explanation. Never two blocks.
3. Wrong picks stay marked red until a different pick is made; the correct pick is marked green.

## Page structure

- Code is the main element and takes the most space. PR notes sit directly above it. Choices are to the right, visible without scrolling.
- Table of contents and progress live in a quiet sidebar.
- Only the notes block and the explanation block get containers; everything else is layered by whitespace. Not everything is a card.

## Visual

- Feels like a tool, like a code-review page, not Duolingo. No confetti, stars, progress animations, or encouragement.
- Two typefaces: one for text, one monospace for code. Body 15 to 16px, line height 1.6, measure under about 70 characters.
- Three semantic colors only: correct (green), wrong (red), accent (one). Everything else is gray scale.
- Never: all-caps eyebrow labels, `A · B · C` metadata, `→` after text, entrance animations on every block.

## Interaction

- Keyboard: number keys pick (and re-pick), Enter goes to the next lesson once the pick is right.
- Feedback is inline on the left. No modals.
- Answers and explanations are never sent to the client ahead of time; the server grades.

## Copy

- Reviewer vocabulary: approve, request changes, merge, matches the intent.
- Declarative short sentences, no exclamation marks. Error messages say what happened and what to do.

## Tech

- React + TypeScript + Vite, no UI framework. One CSS file with variables.
- Lessons live in `lessons.json`, embedded by Go, shared by CLI and web.

## After a change

1. `npm run build`, then `go run . -serve localhost:8080`.
2. Screenshot with headless Chrome in the initial state; if clicking is possible, also the answered state. Check both themes.
3. Walk the hard rules above, especially choice length and redundancy.
