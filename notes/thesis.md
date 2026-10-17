# Thesis

vibe-learning is a learning platform for the AI era, for everyone.

## Old-era learning is slow and unselective

The platform teaches the skills humans still need in the age of "AGI". The core one is **code review**.

## For adults, not only students

Most learning sites are built for students. But today it is not only students who need to learn; adults need to learn even faster:

- A Rust developer may want to learn Go, Python and AI.
- An AI algorithm engineer may want to understand software practice better.

AI keeps getting stronger, and we must get stronger to keep leading it.

## Read and judge code, do not write it

Example: an ordinary Go tutorial makes people write code; we make people **read code and judge it**.

As AI review and compiler tooling get stronger, the point of reading code is no longer technical detail but **alignment and control**: does this code do what we actually want, and should it exist at all.

## Only valid runnable programs, questions in natural language

Do not make the reader spend time on the technical details of a language. Things even an AI cannot get wrong (package names, nil maps, slice aliasing, when defer evaluates) are not worth a human's time.

What we show is always a **valid program that runs**, and we ask the reader about it in **natural language**: what does it do, which data does it delete, who does it limit, what happens when the file is missing, where does it differ from the ticket.

The reader practices one thing: understanding what a correct piece of code **actually does**, and comparing that with **what we want**.

## This is not for beginners

The reader is an expert: already knows at least one language, can program, can reason. We want them to grasp a new language **as fast as possible** without wasting energy.

What the reader needs to learn:

1. Basic syntax and semantics
2. Traps to avoid
3. Fluency in reading large amounts of standard-style code quickly
4. Conventions

What the reader does not need to learn:

1. Trickiness that does not exist in real life
2. Complex logical reasoning (they already have it)

Learning a language is about that language only. No operating systems, networking or databases. Keep every lesson as simple as possible, keeping only the one core difficulty worth the effort.

## Scenario: a senior engineer reviewing code

Every lesson is a code review. In front of the reader is code written by an AI or a colleague, and the reader answers the reviewer's question: approve, or request changes, and for which reason?

Never ask "what is the output". Predicting output is drilling, not reviewing, and not something a senior engineer is asked. When learning a new language, the first thing a reviewer must learn is which constructs look like bugs in other languages but are normal here, and which constructs look normal but are traps here.

What is reviewed is production code, not textbook examples. Lessons must be easy: the only difficulty is unfamiliarity with the language, never the lesson itself.

## Start with basics: explain the highlighted part

The basics stage is not a review. Show a Go snippet with one part highlighted, and three natural-language choices saying what that part is, syntax and semantics, with one correct. Simple enough that someone who has never seen Go guesses right more than 80% of the time from context and common sense. After the basics, move on to reviews.

Rejected formats: a pairing game (match Go snippets to Rust snippets), too much interaction; "one Go snippet, pick the faithful Rust translation of three", which makes the reader read three code blocks for one syntax point. The whole site has one action: read code, click one choice.

## Everything in English

Everything in the repo, lessons, UI, notes, skills and code comments, is written in English.
