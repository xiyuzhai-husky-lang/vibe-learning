---
name: tutorial-generation
description: Rules for writing vibe-learning lessons for expert learners picking up a new language fast (Go first). Two lesson types (highlight basics, senior-engineer code review), five kinds (basics, syntax, trap, reading, convention), valid runnable programs, reviewer questions, short verdict-style choices, terse expert-to-expert explanations, everything in English. Load before adding or editing anything in a lessons.json or designing a new exercise type.
---

# Lesson rules

Read `notes/thesis.md` first.

## Language

Every lesson is written in English: titles, notes, questions, choices, explanations. So is everything else in this repo.

## Who the reader is

An expert. Already knows at least one language, can program, can reason. Wants to grasp a new language **as fast as possible** without wasting energy. This is not a beginner tutorial.

## Two lesson types, both single-choice

Every lesson is **single-choice**. The reader does one thing: read a piece of code and pick one of a few choices. No pairing, dragging, fill-in, or writing code. A pairing game was built and rejected on 2026-10-16 ("this is stupidity"): too much interaction. "One Go snippet, pick the faithful Rust translation of three" was replaced too: the reader should not read three code blocks to learn one syntax point.

1. **Highlight (`type: "highlight"`), the basics stage, placed first.** A Go snippet with one part highlighted, and three **natural-language** choices describing the syntax and semantics of that part, exactly one correct.
   - `highlight` is a substring of `code` that must occur **exactly once** (validated at load). It can be one token (`:=`), a fragment (`a, b int`), a line or a few lines.
   - Choices are natural language, one line, saying **what it is and what it does**. Example: "Declares a new variable" / "Assigns to an existing variable" / "Compares the two sides for equality". No code, no Rust in the choices.
   - **Simple enough that someone who has never seen Go guesses right more than 80% of the time.** Context, names and common sense are enough. The reader learns by guessing; that is the point. If a lesson needs Go knowledge to get right, it is too hard: replace it.
   - The two distractors are **clearly different meanings** (assignment vs declaration, value vs pointer, blocking vs not), so the reader confirms one of three possibilities. Never use nitpicks as distractors.
   - Code is short, two to eight lines, in a realistic function context, containing only that syntax point. It must be valid Go.
   - `question` is always "What is the highlighted part?". `explanation` is one sentence on how Go differs here from the language the reader knows (Rust). `kind: "basics"`.
   - Order by language feature: variables, constants, functions, multiple results, structs, methods, pointers, errors, maps, slices, range, switch, defer, goroutines, channels, interfaces.
2. **Review (`type: "review"`), after the basics.** See the next section.

## Scenario: a senior engineer reviewing code

Every review lesson is one review. The reader is a senior engineer (fluent in other languages, new to this one) looking at code written by an AI or a colleague, possibly with one line of PR notes. The reader always answers the reviewer's question: **approve, or request changes, and for which reason?**

Never ask "what is the output" or "what does it print". Reviewers do not predict output; they judge whether code is correct and idiomatic. Predicting output is drilling, not reviewing.

- Choices are **candidate review verdicts**: the first is usually "Approve", the rest are one-line reasons to request changes.
- The correct answer may be "Approve". Most `syntax` lessons are like that: the code looks like a bug in another language but is correct here, and the reader learns not to reject it. The wrong choices are the "intuitions from other languages".
- For `trap` and `convention` the correct answer is the reason to request changes; the wrong choices always include "Approve" and one plausible but wrong reason.
- `reading` has both: the reader judges whether the PR notes hold for a longer piece of standard code.

## What to teach, what not to

Teach (each lesson belongs to exactly one `kind`):

| kind | teaches | correct verdict is usually |
|---|---|---|
| `syntax` | basic syntax and semantics, especially where they differ from other languages | Approve (looks like a bug, is the normal way here) |
| `trap` | traps people actually hit in real life | Request changes, naming the trap |
| `reading` | reading a large block of standard-style code quickly and checking the PR notes | Approve or request changes, depending on whether the notes hold |
| `convention` | conventions: naming, error handling, signature order, comments, control-flow style | Request changes, naming the convention |

Do not teach:

- Trickiness that does not exist in real life (which one compiles, operator-precedence puzzles, fmt spacing rules).
- Complex logical reasoning. The reader already has it; do not make them trace business logic.
- Anything a compiler, linter or AI will certainly catch, unless it is part of the language's semantics.
- Knowledge outside the language: operating systems, networking, HTTP status codes, databases, third-party libraries. Learning a language tests the language and the core of its standard library only.

## Code looks like production code

What is reviewed is production code, not textbook examples. No divmod(17, 5), no Shape/Rect/Circle toys. Code should look like a PR fragment from a real service: `OrderService`, `Repo.Find`, `Config`, `Worker.Run`, with ctx, with err, with real names. The reader learns "what Go looks like in production", not "how to solve Go puzzles".

Still only the language is tested: the **shape** of production code is real, but the judgment rests only on language semantics, traps and conventions, never on HTTP, database or OS knowledge.

## As simple as it can be

Every lesson must be **easy**. A reviewer should see it at a glance, or let it pass at a glance. If answering needs running the program in your head, computing values, or several steps of inference, the lesson is too hard: delete or rewrite it. Difficulty comes from unfamiliarity with the language, never from the lesson.

Keep exactly one core difficulty per lesson and cut everything else. If int and string can say it, do not use files, networking or databases; if 10 lines can say it, do not write 20. The reader's energy goes to that one difficulty only.

## Hard rules

1. **Code is a valid program that runs** (`convention` lessons may show parallel A/B/C fragments).
2. **The question is always the reviewer's question.** Default "Your review?". Never ask for output, results or definitions.
3. **Choices are conclusions, not arguments.** One line, no "because" or "should". Mutually exclusive, same dimension, similar length. The correct one is never the longest. Two to four of them.
4. **Explanations are expert-to-expert, one to three sentences.** State the semantics, the why, and one comparison with a language the reader may know (Rust, Python, C++). No warm-up, no padding.
5. **Code is short.** `syntax`/`trap`/`convention` usually under 15 lines; `reading` may run 25 to 40 lines but must be a standard shape found in real projects, not an artificial example.
6. **`note` is optional and is the PR notes.** The author (an AI) claims what the code does. `reading` lessons usually need it; the review is checking that claim.
7. **Each kind forms a system.** `syntax` covers language features in order (multiple results, zero values, slices, maps, structs and methods, interfaces, errors, for/range, goroutines/channels); `trap` collects only high-frequency real-world traps; `convention` covers naming, errors, signatures, comments, control-flow style.

## lessons.json fields

Highlight lesson:

```json
{
  "id": "hl-short-var",
  "type": "highlight",
  "kind": "basics",
  "title": "Short variable declaration",
  "code": "func main() {\n\tn := 42\n\tfmt.Println(n)\n}",
  "highlight": ":=",
  "question": "What is the highlighted part?",
  "choices": ["Declares a new variable", "Assigns to an existing variable", "Compares the two sides for equality"],
  "answer": 0,
  "explanation": "One sentence on the difference from Rust."
}
```

Review lesson:

```json
{
  "id": "kebab-case",
  "type": "review",
  "kind": "syntax | trap | reading | convention",
  "title": "One line, no spoiler",
  "note": "Optional PR notes",
  "code": "valid code",
  "question": "Your review?",
  "choices": ["Approve", "One-line reason to request changes", "One-line reason to request changes"],
  "answer": 0,
  "explanation": "One to three sentences, expert-to-expert."
}
```

## Self-check after writing

- Does someone who knows Rust or Python but not Go learn one concrete fact or habit of Go from this lesson? If you cannot name it, delete the lesson.
- Is this a question a reviewer would ask? "What is the output" is not; delete and rewrite.
- Would this come up in real life? If not, delete.
- Is there knowledge outside the language (OS, networking, HTTP, databases, third-party libraries)? Replace with a pure-language example.
- Can one more line be cut without losing the core difficulty? Cut it.
- Would this code appear in a real service's PR? If not (toy functions, geometry, arithmetic puzzles), rewrite.
- Does answering require running the program in your head? Then it is too hard.
- Is the longest choice the correct one? Fix it.
- Is the explanation longer than three sentences? Cut.
- Is any of it not in English? Rewrite it.
