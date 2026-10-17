export type Kind = "basics" | "syntax" | "trap" | "reading" | "convention";

export const KIND_LABEL: Record<Kind, string> = {
  basics: "Basics",
  syntax: "Syntax",
  trap: "Traps",
  reading: "Reading",
  convention: "Conventions",
};

interface LessonBase {
  id: string;
  kind: Kind;
  title: string;
}

export interface ChoiceLesson extends LessonBase {
  type: "review" | "highlight";
  note?: string;
  code: string;
  highlight?: string; // highlight lessons: the substring of code to mark
  question: string;
  choices: string[];
}

export type Lesson = ChoiceLesson;

// The server says only whether the pick was right. The explanation comes with a correct pick.
export interface ChoiceVerdict {
  correct: boolean;
  explanation?: string;
}

export async function fetchLessons(): Promise<Lesson[]> {
  const res = await fetch("/api/lessons");
  if (!res.ok) throw new Error(`Could not load lessons: ${res.status}`);
  return res.json();
}

async function post<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Could not grade the answer: ${res.status}`);
  return res.json();
}

export const submitChoice = (id: string, choice: number) => post<ChoiceVerdict>({ id, choice });
