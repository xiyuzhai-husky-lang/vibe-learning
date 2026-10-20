import type { Category, CourseSummary } from "./api";

export function countCourses(cat: Category, pred: (c: CourseSummary) => boolean = () => true): number {
  return cat.courses.filter(pred).length + cat.children.reduce((n, c) => n + countCourses(c, pred), 0);
}

// Every category in depth-first order with its depth, for flat renderings of the tree.
export function flatten(cat: Category, depth = 0): { cat: Category; depth: number }[] {
  return [{ cat, depth }, ...cat.children.flatMap((c) => flatten(c, depth + 1))];
}

// One category of the encyclopedia: a heading, its entries, then its subcategories.
export function CategoryView({ category, depth, onOpen }: { category: Category; depth: number; onOpen: (id: string) => void }) {
  const Heading = (depth <= 2 ? "h2" : depth === 3 ? "h3" : "h4") as "h2" | "h3" | "h4";
  return (
    <section className={`category depth-${depth}`}>
      <Heading className="category-label">{category.label}</Heading>
      {category.courses.length > 0 && (
        <ul className="entries">
          {category.courses.map((c) => <Entry key={c.id} course={c} onOpen={onOpen} />)}
        </ul>
      )}
      {category.children.map((c) => <CategoryView key={c.id} category={c} depth={depth + 1} onOpen={onOpen} />)}
    </section>
  );
}

export function Entry({ course, onOpen }: { course: CourseSummary; onOpen: (id: string) => void }) {
  const empty = course.count === 0;
  return (
    <li className={`entry ${empty ? "empty" : ""}`}>
      <a href={`/${course.id}`} onClick={(e) => { e.preventDefault(); onOpen(course.id); }}>
        <span className="entry-title">{course.title}</span>
        <span className="entry-count">{empty ? "empty" : `${course.count} lessons`}</span>
      </a>
    </li>
  );
}

