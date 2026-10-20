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

## What is left for the human: every language feature, one atomic snippet at a time

Two review directions were rejected on 2026-10-18. Language traps and conventions: "advancement of AI and checkers and provers will make these sort of thing trivial". Checking code against a ticket: "we'll use CNL to fix this"; intent will be written in a controlled natural language, so code-vs-intent checking becomes mechanical.

The decision: **"just covering every language features with atomic code snippets are enough."** The product for learning a language is the basics stage and nothing else. Every feature of the language gets one or more atomic snippets, each with one highlighted part and three natural-language choices saying what that part is. Coverage is the goal: when the reader has guessed their way through every feature, they can read any code in the language, and reading is all a human needs when AI writes, checkers verify and CNL carries intent.

Never ask "what is the output". Predicting output is drilling, not reading.

## The same format learns a codebase

After Go, the user asked for Splash, Inco AI's local inference engine (2026-10-18). The first attempt learned it the same way as a language: verbatim snippets, one highlighted part, what is it. The user rejected that on 2026-10-19: "the exercises are about unimportant little details", "you mistook codebase for reading code". Learning a codebase is not reading its code. It is knowing the system: its parts and boundaries, the flows through it, what it keeps and why, the few invariants it rests on, how it fails, and where a change belongs. Those are the questions, in plain words, with code only as evidence. That is what someone needs in order to direct an AI at a codebase and judge what comes back.

## An encyclopedia of courses: a tree, mostly empty, connected

The user set the shape of the catalog on 2026-10-19: there should be tons of courses, organised like an encyclopedia, as a tree, with entries connected to each other, most of them empty until the content is needed. So the catalog is a tree of categories (languages by family, codebases by domain, tools) in which every language, tool or codebase worth reading gets an entry now, and each entry links to the entries a reader should see next. Filling an entry is the same job as before: every feature or subsystem, one atomic snippet at a time. The map comes first; the content follows demand.

## User data stays local

Whatever a learner does (answers, first-try results) is stored locally, in a gitignored `.local/` directory at the repository root, never in a tracked file.

## Papers, the same way

A paper is learned like a codebase (2026-10-20): the map of the idea first, then questions that ask why it works, what it assumes and costs, and what followed. Not reading the paper's sentences and guessing what they mean. The catalog's top level is Languages, Papers, Codebases.

## Everything in English

Everything in the repo, lessons, UI, notes, skills and code comments, is written in English.
