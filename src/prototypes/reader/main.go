// reader is the first vibe-learning prototype: learn a language by reading atomic snippets, or a
// codebase by answering questions about its architecture. Never by writing code.
package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"strconv"
	"strings"
)

func main() {
	courseID := flag.String("course", "go", "course to run: "+strings.Join(courseIDs(), ", "))
	only := flag.String("lesson", "", "run only the lesson with this ID")
	list := flag.Bool("list", false, "list the course's lessons")
	addr := flag.String("serve", "", "start the web server, e.g. -serve localhost:8080")
	webDir := flag.String("web", "web/dist", "directory of the built frontend (with -serve)")
	dataDir := flag.String("data", defaultDataDir(), "directory for learner data, never inside the repository's tracked files")
	catalogOnly := flag.Bool("catalog", false, "print the catalog tree and exit")
	flag.Parse()

	if *addr != "" {
		serve(*addr, *webDir, *dataDir)
		return
	}
	if *catalogOnly {
		printCatalog(catalog, "")
		return
	}

	course, ok := courses[*courseID]
	if !ok {
		fmt.Fprintf(os.Stderr, "no course %q; courses: %s\n", *courseID, strings.Join(courseIDs(), ", "))
		os.Exit(2)
	}

	if *list {
		for i, l := range course.Lessons {
			fmt.Printf("%2d. %-13s %-26s %s\n", i+1, l.Kind, l.ID, l.Title)
		}
		return
	}

	selected := course.Lessons
	if *only != "" {
		l, ok := course.findLesson(*only)
		if !ok {
			fmt.Fprintf(os.Stderr, "no lesson with ID %q; use -list to see them\n", *only)
			os.Exit(2)
		}
		selected = []Lesson{l}
	}

	in := bufio.NewScanner(os.Stdin)
	correct := 0
	for i, l := range selected {
		fmt.Printf("\n━━━ Lesson %d/%d [%s] %s ━━━\n\n", i+1, len(selected), course.kindLabel(l.Kind), l.Title)
		ok, done := runReview(in, l)
		if !done {
			fmt.Println("\n(input ended, stopping early)")
			break
		}
		if ok {
			correct++
		}
	}
	fmt.Printf("\nDone: %d/%d correct\n", correct, len(selected))
}

func printCatalog(cat *Category, indent string) {
	for _, c := range cat.Courses {
		n := "empty"
		if len(c.Lessons) > 0 {
			n = fmt.Sprintf("%d lessons", len(c.Lessons))
		}
		fmt.Printf("%s%-16s %s (%s)\n", indent, c.ID, c.Title, n)
	}
	for _, ch := range cat.Children {
		fmt.Printf("%s%s/\n", indent, ch.Label)
		printCatalog(ch, indent+"  ")
	}
}

func courseIDs() []string {
	ids := []string{}
	for _, c := range orderedCourses() {
		ids = append(ids, c.ID)
	}
	return ids
}

func runReview(in *bufio.Scanner, l Lesson) (ok, done bool) {
	if l.Code != "" {
		if l.File != "" {
			fmt.Printf("%s\n\n", l.File)
		}
		fmt.Println(indent(strings.Replace(l.Code, l.Highlight, "»"+l.Highlight+"«", 1)))
		fmt.Println()
	}
	if l.Context != "" {
		fmt.Printf("%s\n\n", l.Context)
	}
	fmt.Printf("%s\n\n", l.Question)
	for j, c := range l.Choices {
		fmt.Printf("  %d) %s\n", j+1, c)
	}
	pick, got := askInt(in, fmt.Sprintf("\nYour pick [1-%d]: ", len(l.Choices)), len(l.Choices))
	if !got {
		return false, false
	}
	if pick == l.Answer {
		fmt.Println("\n✔ Correct.")
	} else {
		fmt.Printf("\n✘ Not quite, the answer is %d).\n", l.Answer+1)
	}
	fmt.Printf("\n%s\n", l.Explanation)
	return pick == l.Answer, true
}

func askInt(in *bufio.Scanner, prompt string, n int) (int, bool) {
	for {
		fmt.Print(prompt)
		if !in.Scan() {
			return 0, false
		}
		k, err := strconv.Atoi(strings.TrimSpace(in.Text()))
		if err != nil || k < 1 || k > n {
			fmt.Printf("Enter a number from 1 to %d.\n", n)
			continue
		}
		return k - 1, true
	}
}

func indent(code string) string {
	lines := strings.Split(code, "\n")
	for i, ln := range lines {
		lines[i] = "    " + ln
	}
	return strings.Join(lines, "\n")
}
