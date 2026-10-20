---
name: tutorial-generation
description: Rules for writing vibe-learning lessons for expert learners picking up a new language fast (Go first). One lesson type: an atomic Go snippet with one highlighted part and three natural-language choices, covering every language feature, grouped by feature; valid Go, guessable by someone new to the language, one-sentence explanations, everything in English. Load before adding or editing anything in a lessons.json or designing a new exercise type.
---

# Lesson rules

Two kinds of course share one lesson format: a **language course** (Go) and a **codebase course** (Splash). Both are atomic snippets with one highlighted part and three natural-language choices. The sections below are written for the language course; the codebase section at the end says what changes.

Read `notes/thesis.md` first.

## Language

Every lesson is written in English: titles, notes, questions, choices, explanations. So is everything else in this repo.

## Who the reader is

An expert. Already knows at least one language, can program, can reason. Wants to grasp a new language **as fast as possible** without wasting energy. This is not a beginner tutorial.

## One lesson type: highlight, covering every language feature

Every lesson is **single-choice**: read a snippet, pick one of three choices. No pairing, dragging, fill-in, or writing code. No review lessons either: traps and conventions were rejected because checkers, provers and AI make them trivial; checking code against a ticket was rejected because CNL (controlled natural language) will make intent mechanical. The user's decision on 2026-10-18: **"just covering every language features with atomic code snippets are enough."**

A lesson (`kind` = feature group, see below) is: a Go snippet with one part highlighted, and three **natural-language** choices describing the syntax and semantics of that part, exactly one correct.

- **Coverage is the goal.** Walk the language specification feature by feature and give each feature at least one atomic snippet: declarations, basic types and conversions, constants and iota, functions, closures, defer, control flow, arrays, slices, maps, structs, embedding, pointers, methods, interfaces, type assertions, errors, goroutines, channels, select, sync, generics, packages and visibility. A feature with two distinct behaviors (buffered vs unbuffered channel, value vs pointer receiver) gets two snippets.
- **Atomic.** One feature per snippet, two to ten lines, in a realistic function context but with nothing else going on. Valid Go.
- `highlight` is a substring of `code` that must occur **exactly once** (validated at load). It can be one token (`:=`), a fragment (`a, b int`), a line or a few lines.
- Choices are natural language, one line, saying **what it is and what it does**. No code and no other language in the choices.
- **Simple enough that someone who has never seen Go guesses right more than 80% of the time.** Context, names and common sense are enough. The reader learns by guessing. If a lesson needs Go knowledge to get right, it is too hard: replace it.
- The two distractors are **clearly different meanings** (assignment vs declaration, value vs pointer, blocking vs not). Never nitpicks.
- `question` is always "What is the highlighted part?". `explanation` is one sentence on how Go differs here from the language the reader knows (Rust first). The correct choice is never the longest.
- Order lessons feature by feature, simple before compound, so the sidebar reads like a table of contents of the language.

### Feature groups (`kind`)

| kind | covers |
|---|---|
| `declarations` | package, import, var, :=, const, iota, blank identifier, type declarations, aliases, visibility by case |
| `types` | numeric types, strings, bytes and runes, conversions, untyped constants, zero values |
| `functions` | parameters, results, multiple results, named results, variadic, function values, closures, defer, panic and recover |
| `control` | if with statement, for in its forms, range over slice, map, string, int and channel, switch, type switch, labels, select |
| `collections` | arrays, slices, make, append, copy, slicing, maps, delete, comma-ok, iteration order |
| `structs` | struct types and literals, embedding and promotion, pointers, new, methods, value vs pointer receivers, method values |
| `interfaces` | interface types, implicit implementation, any, type assertions, type switch, embedding, Stringer, error interface |
| `errors` | errors.New, fmt.Errorf with %w, errors.Is and As, sentinel errors, custom error types, panic vs error |
| `concurrency` | go, unbuffered and buffered channels, close, range over channel, select with default, WaitGroup, Mutex, context |
| `generics` | type parameters, constraints, any and comparable, ~T, generic types, inference |

## Code looks like real code

Snippets sit in a realistic function context with real names (`OrderService`, `Repo.Find`, `cfg`, `ctx`), not divmod(17, 5) or Shape/Rect/Circle. But only the one feature is going on; everything else is cut. If int and string can say it, do not use files, networking or databases.

## Hard rules

1. **Code is valid Go.** Every snippet passes gofmt; snippets below top level are wrapped in a function for the check.
2. **The question is fixed:** "What is the highlighted part?".
3. **Choices are conclusions, not arguments.** One line, no "because". Mutually exclusive, same dimension, similar length. The correct one is never the longest. Exactly three.
4. **Explanation is one sentence**, expert-to-expert, naming the difference from Rust (or Python, C++) where there is one.
5. **Highlight occurs exactly once** in the code.
6. **No knowledge outside the language**: no OS, networking, HTTP, databases, third-party libraries. The standard library appears only where it is the language's own idiom (fmt, errors, strings, sort, slices, sync, time, context).

## lessons.json fields

```json
{
  "id": "decl-short-var",
  "kind": "declarations",
  "title": "Short variable declaration",
  "code": "func main() {\n\tn := 42\n\tfmt.Println(n)\n}",
  "highlight": ":=",
  "question": "What is the highlighted part?",
  "choices": ["Declares a new variable", "Assigns to an existing variable", "Compares the two sides for equality"],
  "answer": 0,
  "explanation": "One sentence on the difference from Rust."
}
```

## Self-check after writing

- Does someone who knows Rust or Python but not Go learn one concrete fact of Go from this lesson? If you cannot name it, delete the lesson.
- Could someone who never saw Go guess it from context and names? If not, simplify.
- Is exactly one feature going on? If two, split.
- Is there knowledge outside the language? Replace with a pure-language example.
- Is the longest choice the correct one? Fix it.
- Is the explanation longer than one sentence? Cut.
- Is every feature of the language covered by at least one snippet? If not, the lesson set is not done.
- Is any of it not in English? Rewrite it.

## Codebase courses: learn the system, not the code

Set by the user on 2026-10-18 ("how about we learn splash of inco ai now") and corrected on 2026-10-19 after the first 92-lesson Splash course: "I feel like the exercises are about unimportant little details", "you mistook codebase for reading code". The first course highlighted tokens in verbatim snippets (what is `server.server`, what is `MAX_ROWS = 9`) and taught trivia. A codebase course is not reading code.

**What a codebase course teaches:** what a tech lead knows about the system and what someone directing an AI to change it must know.

- **Map**: the parts, the processes, the languages, where each lives, which part owns what.
- **Boundaries**: what crosses each interface and what never does (for Splash: token ids cross the server/engine pipe, chat text never does).
- **Flows**: the life of a request, of a startup, of an install, of a model load; what happens in which order and why that order.
- **State and memory**: what is cached, what names a cache entry, what is reusable, what the budget is spent on, what is evicted first.
- **Design decisions and invariants**: the few rules the whole system rests on (one GPU command in flight; no mmap of weights; content-addressed KV; speculative decoding with exact acceptance) and what each one buys.
- **Failure and operations**: what a 503 means, what restarts, what gives up, what the status page says, which knobs exist.
- **Where to change what**: to add a feature or fix a bug of a given kind, which component is the right place, and which is the wrong place that looks right.

**Never a recall question.** The user rejected "A request arrives at /v1/chat/completions. Which process turns the chat messages into token ids?" ("what is the point of this??", 2026-10-19): an isolated placement fact that nobody can reason out and that teaches nothing by itself. Where and which are recall; architecture is understood through why and what follows. So:

- **Each group opens with a map.** The first lesson of a group carries a `context`: a short paragraph (4-8 sentences) stating the architecture of that aspect as fact: the parts, who owns what, the rule. The learner reads it first. It is the lesson; the questions check that it was understood.
- **Every question asks why or what follows**, reasoning from the map: "Why does tokenization live in the server rather than the engine?" (the tokenizer and templates are Python-ecosystem artefacts; the engine stays model math and never needs a Jinja renderer), "The engine crashes mid-request. Given the split, which of these survive: the KV cache, the HTTP connections, the tokenizer?", "What would break if the server batched requests itself?", "Why refuse a request instead of making it wait for memory?". A learner who understood the map can derive the answer; a learner who only memorised placements cannot.
- Wrong choices are reasons or consequences a newcomer would find plausible, not placements.

**Lesson shape.** Same single-choice lesson; `question` in plain words, 1-3 sentences, may set a scenario; optional `context` as above. No code is shown: the learner answers from the question alone ("codebases AREN'T for reading code", user, 2026-10-19), and an excerpt that states the answer makes the question pointless. A draft may carry a `code` excerpt for the reviewer, and the assembler verifies it, but only `files` (the paths the fact rests on) reach the lesson, shown after the explanation. Three plain-language choices; the wrong ones are the answers a smart newcomer would guess (the other component, the other order, the obvious-but-wrong design). The explanation says why the system is this way, in one or two sentences.

**Hard rules.**
- Every lesson must pass "would a tech lead care?" A constant's value, a flag's name, a type's shape fail unless they are the system's rule (the 32-token page is the unit of cache sharing: that passes).
- Never ask what a token is; ask what the system does, why, where.
- Every fact is checked against the repository at the pinned commit; each lesson lists the `files` it rests on (repo-relative paths that must exist), so a reviewer can verify it.
- Kinds are the seven groups above, in that order; 5 to 12 lessons each; a course of 40 to 70 lessons.
- Guessable: more than 80% of good engineers who have never seen the repository, reasoning from the question and the system's purpose, pick right.
- Choices stay within about 10 characters of each other and the correct one is never the longest; one lesson teaches one fact; everything in English.

## Paper courses: understand the idea, not the text

Set by the user on 2026-10-20 ("we work on papers instead"; the catalog's top level is Languages, Papers, Codebases). A paper course teaches what a reader who understood the paper knows, by the same rules as codebase courses: no quoting the paper and asking what a sentence means; a map first, then why and what follows.

- **Groups, in order:** `problem` (what was slow, wrong or impossible, and why), `idea` (the move the paper makes, in plain words), `why-it-works` (the argument or proof, as reasoning the learner can follow), `assumptions` (what it needs and what it costs), `results` (what was measured, how big, and the limits), `aftermath` (what the idea enabled and what replaced or refined it). 3 to 6 lessons each.
- **The first lesson of each group carries a `context`**: 4-8 sentences stating that aspect as fact, written by us, not quoted. The questions reason from it.
- **Questions ask why or what follows**: "Why is a single target pass over several draft tokens about as cheap as one token?", "What would break if a rejected token were replaced by a sample from the target alone?", "When does the method stop helping?". Never "what does Section 3 say" and never recall of a number unless the number is the point.
- Wrong choices are reasons a smart reader would find plausible. Choices at most 64 characters, within about 10 of each other, correct never the longest. Explanation 1-2 sentences.
- `files` holds the references the fact rests on, as section, theorem, figure or equation numbers of the paper ("Section 3.2", "Theorem 3"), so a learner can check; `course.json` names the paper and its arXiv or DOI link in `source`.
- Every fact checked against the paper itself. Everything in English.
