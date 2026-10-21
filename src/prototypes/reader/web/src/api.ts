export interface CourseSummary {
  id: string;
  title: string;
  tagline: string;
  source?: string;
  count: number; // 0 for an entry whose content is not written yet
  related: string[]; // ids of the courses to see next
}

// One node of the catalog tree. The root has an empty id.
export interface Category {
  id: string;
  label: string;
  children: Category[];
  courses: CourseSummary[];
}

export interface Kind {
  id: string;
  label: string;
}

// One atomic snippet: code with a highlighted substring and three choices. No answer is sent.
export interface Lesson {
  id: string;
  kind: string;
  title: string;
  file?: string; // codebase courses: repo-relative path of the snippet
  files?: string[]; // codebase courses: paths the fact rests on
  language: string; // tree-sitter grammar: go | cpp | python | text
  code?: string; // optional: evidence for the question
  highlight?: string; // a substring of code, or absent
  context?: string; // exposition read before the question
  figure?: string; // inline SVG illustration (our own content)
  question: string;
  choices: string[];
}

// One mechanism explained before the exercises: Markdown with inline SVG figures and $math$.
export interface Reading {
  id: string;
  title: string;
  body: string;
}

export interface Course {
  id: string;
  title: string;
  tagline: string;
  source?: string;
  path: Kind[]; // categories from the root down: the breadcrumb
  related: CourseSummary[]; // see also
  readings: Reading[]; // read first
  kinds: Kind[];
  lessons: Lesson[];
}

// What the learner did on one lesson, kept by the server in its local data directory.
export interface LessonProgress {
  wrong: number[]; // choices tried and rejected
  solved?: number; // the correct choice, once picked
}

// The server says whether the pick was right and gives the explanation, never the answer index.
export interface ChoiceVerdict {
  correct: boolean;
  explanation: string;
  progress: LessonProgress;
}

export type CourseProgress = Record<string, LessonProgress & { explanation: string }>;

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url}: ${res.status}`);
  return res.json();
}

export const fetchCatalog = () => get<Category>("/api/courses");
export const fetchCourse = (id: string) => get<Course>(`/api/courses/${encodeURIComponent(id)}`);
export const fetchProgress = (id: string) => get<CourseProgress>(`/api/progress/${encodeURIComponent(id)}`);

export async function resetProgress(id: string): Promise<void> {
  const res = await fetch(`/api/progress/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Could not reset progress: ${res.status}`);
}

export async function submitChoice(course: string, id: string, choice: number): Promise<ChoiceVerdict> {
  const res = await fetch("/api/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ course, id, choice }),
  });
  if (!res.ok) throw new Error(`Could not grade the answer: ${res.status}`);
  return res.json();
}
