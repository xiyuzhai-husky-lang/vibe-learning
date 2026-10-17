# Exercise formats (working notes)

> Exercise design ideas derived from the "read and judge code" section of [thesis.md](thesis.md). Not settled.

## Principles

- The exercise is a review or a judgment, never writing code. The learner is the reviewer; the AI is the author.
- Asking merely "is this Go code correct" degenerates into a technical quiz. Lessons test alignment with intent and control.
- Only valid programs that run; the question asks in natural language what the code actually does. Never test language trivia that an AI or a compiler cannot get wrong.
- Choices are one-line conclusions without argument; the explanation appears once, after the answer.
- The learner should state a conclusion and a reason, and see the consequence of a wrong judgment, so the format does not degenerate into passive multiple choice. Approving a change that quietly deviates from the ticket should show what happened after it shipped.

## Draft formats

- Given a ticket and two PRs that both pass CI. Which one should merge, and where did the other misread the ticket?
- This change is correct and well written. Should it exist?
- The AI explains its change confidently. Find the sentence the diff does not support.
- Given a diff and its tests. Which behavior did the author silently accept without saying so?
