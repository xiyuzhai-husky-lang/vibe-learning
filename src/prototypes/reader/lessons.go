package main

import (
	"embed"
	"encoding/json"
	"io/fs"
	"log"
	"path"
	"regexp"
	"sort"
	"strings"
)

// The catalog is an encyclopedia: a tree of categories whose leaves are courses, most of them
// empty until their content is needed. The directory tree under courses/ is the catalog itself:
// a directory with course.json is a course, any other directory is a category with category.json.

// A Course is one thing to learn by reading: a language (Go) or a codebase (Splash).
type Course struct {
	ID       string   `json:"id"`
	Title    string   `json:"title"`
	Tagline  string   `json:"tagline"`
	Language string   `json:"language"`         // default tree-sitter language for snippets
	Source   string   `json:"source,omitempty"` // repository the snippets come from, for codebase courses
	Related  []string `json:"related"`          // ids of courses to see next
	Kinds    []Kind   `json:"kinds"`            // feature groups or subsystems, in display order

	Readings []Reading   `json:"-"` // explanations read before the lessons, in order
	Lessons  []Lesson    `json:"-"`
	Path     []*Category `json:"-"` // categories from the root down to this course's parent
}

// A Reading is one mechanism explained in our own words, read before the exercises: Markdown
// from readings/NN-slug.md with "@figure name" lines replaced by the inline SVG readings/name.svg.
type Reading struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Body  string `json:"body"` // Markdown with inline SVG; math in $...$ and $$...$$
}

type Kind struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

// A Category is an inner node of the catalog tree.
type Category struct {
	ID       string      `json:"id"`
	Label    string      `json:"label"`
	Order    int         `json:"order"`
	Children []*Category `json:"-"`
	Courses  []*Course   `json:"-"`
}

// Lesson is one question with three natural-language choices. Language lessons show a
// snippet with one highlighted part and ask what it is; codebase lessons ask about the
// architecture in plain words and carry code only as evidence, often none.
type Lesson struct {
	ID          string   `json:"id"`
	Kind        string   `json:"kind"`
	Title       string   `json:"title"`
	File        string   `json:"file,omitempty"`      // codebase courses: repo-relative path of the snippet
	Files       []string `json:"files,omitempty"`     // codebase courses: paths the fact rests on
	Language    string   `json:"language,omitempty"`  // overrides the course language
	Code        string   `json:"code,omitempty"`      // optional
	Highlight   string   `json:"highlight,omitempty"` // a substring that occurs exactly once in Code, or empty
	Context     string   `json:"context,omitempty"`   // exposition read before the question: the map of this aspect
	Figure      string   `json:"figure,omitempty"`    // inline SVG illustration, shown between context and question
	Question    string   `json:"question"`
	Choices     []string `json:"choices"`
	Answer      int      `json:"answer"`
	Explanation string   `json:"explanation"`
}

//go:embed courses
var coursesFS embed.FS

var catalog, courses = mustLoadCatalog()

func mustLoadCatalog() (*Category, map[string]*Course) {
	byID := map[string]*Course{}
	root := loadCategory("courses", &Category{ID: "", Label: "Courses"}, nil, byID)
	for _, c := range byID {
		for _, r := range c.Related {
			if _, ok := byID[r]; !ok {
				log.Fatalf("course %s: related course %q does not exist", c.ID, r)
			}
		}
	}
	return root, byID
}

func loadCategory(dir string, cat *Category, trail []*Category, byID map[string]*Course) *Category {
	entries, err := coursesFS.ReadDir(dir)
	if err != nil {
		log.Fatalf("read %s: %v", dir, err)
	}
	trail = append(append([]*Category{}, trail...), cat)
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		sub := path.Join(dir, e.Name())
		if exists(path.Join(sub, "course.json")) {
			c := loadCourse(sub, e.Name())
			c.Path = trail
			if _, dup := byID[c.ID]; dup {
				log.Fatalf("course id %q appears twice in the catalog", c.ID)
			}
			byID[c.ID] = c
			cat.Courses = append(cat.Courses, c)
			continue
		}
		child := &Category{ID: e.Name()}
		mustReadJSON(path.Join(sub, "category.json"), child)
		child.ID = e.Name()
		cat.Children = append(cat.Children, loadCategory(sub, child, trail, byID))
	}
	sort.SliceStable(cat.Children, func(i, j int) bool {
		a, b := cat.Children[i], cat.Children[j]
		if a.Order != b.Order {
			return a.Order < b.Order
		}
		return a.Label < b.Label
	})
	sort.SliceStable(cat.Courses, func(i, j int) bool {
		return strings.ToLower(cat.Courses[i].Title) < strings.ToLower(cat.Courses[j].Title)
	})
	return cat
}

func loadCourse(dir, name string) *Course {
	c := &Course{}
	mustReadJSON(path.Join(dir, "course.json"), c)
	if c.ID != name {
		log.Fatalf("course %q: id %q does not match its directory", dir, c.ID)
	}
	if c.Related == nil {
		c.Related = []string{}
	}
	if c.Kinds == nil {
		c.Kinds = []Kind{}
	}
	// lessons.json is optional: an entry exists before its content does.
	if exists(path.Join(dir, "lessons.json")) {
		mustReadJSON(path.Join(dir, "lessons.json"), &c.Lessons)
	}
	c.Readings = loadReadings(path.Join(dir, "readings"))
	validate(c)
	return c
}

var figureLine = regexp.MustCompile(`(?m)^@figure ([a-z0-9-]+)$`)

func loadReadings(dir string) []Reading {
	out := []Reading{}
	if !exists(dir) {
		return out
	}
	entries, err := fs.ReadDir(coursesFS, dir)
	if err != nil {
		log.Fatalf("read %s: %v", dir, err)
	}
	for _, e := range entries { // ReadDir sorts by name, so the NN- prefix orders the readings
		name := e.Name()
		if !strings.HasSuffix(name, ".md") {
			continue
		}
		b, err := coursesFS.ReadFile(path.Join(dir, name))
		if err != nil {
			log.Fatalf("read %s: %v", name, err)
		}
		body := string(b)
		title, rest, ok := strings.Cut(strings.TrimSpace(body), "\n")
		if !ok || !strings.HasPrefix(title, "# ") {
			log.Fatalf("%s/%s: a reading starts with a # title line", dir, name)
		}
		rest = figureLine.ReplaceAllStringFunc(rest, func(m string) string {
			svg, err := coursesFS.ReadFile(path.Join(dir, figureLine.FindStringSubmatch(m)[1]+".svg"))
			if err != nil {
				log.Fatalf("%s/%s: %v", dir, name, err)
			}
			return "<figure class=\"figure\">" + strings.TrimSpace(string(svg)) + "</figure>"
		})
		id := strings.TrimSuffix(name, ".md")
		if i := strings.Index(id, "-"); i > 0 && strings.Trim(id[:i], "0123456789") == "" {
			id = id[i+1:]
		}
		out = append(out, Reading{ID: id, Title: strings.TrimPrefix(title, "# "), Body: strings.TrimSpace(rest)})
	}
	return out
}

func exists(name string) bool {
	_, err := fs.Stat(coursesFS, name)
	return err == nil
}

func mustReadJSON(name string, v any) {
	b, err := coursesFS.ReadFile(name)
	if err != nil {
		log.Fatalf("read %s: %v", name, err)
	}
	if err := json.Unmarshal(b, v); err != nil {
		log.Fatalf("parse %s: %v", name, err)
	}
}

func validate(c *Course) {
	kinds := map[string]bool{}
	for _, k := range c.Kinds {
		kinds[k.ID] = true
	}
	seen := map[string]bool{}
	for _, l := range c.Lessons {
		if seen[l.ID] {
			log.Fatalf("course %s: duplicate lesson ID %q", c.ID, l.ID)
		}
		seen[l.ID] = true
		if !kinds[l.Kind] {
			log.Fatalf("course %s: lesson %q has invalid kind %q", c.ID, l.ID, l.Kind)
		}
		if l.Answer < 0 || l.Answer >= len(l.Choices) {
			log.Fatalf("course %s: lesson %q: answer out of range", c.ID, l.ID)
		}
		if l.Code == "" && l.Highlight != "" {
			log.Fatalf("course %s: lesson %q: highlight without code", c.ID, l.ID)
		}
		if l.Highlight != "" && strings.Count(l.Code, l.Highlight) != 1 {
			log.Fatalf("course %s: lesson %q: highlight must occur exactly once in code", c.ID, l.ID)
		}
		if l.Question == "" || len(l.Choices) != 3 {
			log.Fatalf("course %s: lesson %q: needs a question and three choices", c.ID, l.ID)
		}
	}
}

// walk visits every course in catalog order (depth-first, categories then their courses).
func (cat *Category) walk(f func(trail []*Category, c *Course)) {
	var rec func(cat *Category, trail []*Category)
	rec = func(cat *Category, trail []*Category) {
		trail = append(trail, cat)
		for _, c := range cat.Courses {
			f(trail, c)
		}
		for _, ch := range cat.Children {
			rec(ch, trail)
		}
	}
	rec(cat, nil)
}

// orderedCourses returns every course in catalog order.
func orderedCourses() []*Course {
	out := []*Course{}
	catalog.walk(func(_ []*Category, c *Course) { out = append(out, c) })
	return out
}

func (c *Course) kindLabel(kind string) string {
	for _, k := range c.Kinds {
		if k.ID == kind {
			return k.Label
		}
	}
	return kind
}

func (c *Course) findLesson(id string) (Lesson, bool) {
	for _, l := range c.Lessons {
		if l.ID == id {
			return l, true
		}
	}
	return Lesson{}, false
}
