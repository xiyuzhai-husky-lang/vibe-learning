// go-choices is the first vibe-learning prototype: learn Go by judging code, never by writing it.
// Basics first (what does the highlighted syntax mean?), then review production code like a senior engineer.
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
	only := flag.String("lesson", "", "run only the lesson with this ID")
	list := flag.Bool("list", false, "list all lessons")
	addr := flag.String("serve", "", "start the web server, e.g. -serve localhost:8080")
	webDir := flag.String("web", "web/dist", "directory of the built frontend (with -serve)")
	flag.Parse()

	if *addr != "" {
		serve(*addr, *webDir)
		return
	}

	if *list {
		for i, l := range lessons {
			fmt.Printf("%2d. %-7s %-11s %-20s %s\n", i+1, l.Type, l.Kind, l.ID, l.Title)
		}
		return
	}

	selected := lessons
	if *only != "" {
		l, ok := findLesson(*only)
		if !ok {
			fmt.Fprintf(os.Stderr, "no lesson with ID %q; use -list to see them\n", *only)
			os.Exit(2)
		}
		selected = []Lesson{l}
	}

	in := bufio.NewScanner(os.Stdin)
	correct := 0
	for i, l := range selected {
		fmt.Printf("\n━━━ Lesson %d/%d [%s] %s ━━━\n\n", i+1, len(selected), kindLabel(l.Kind), l.Title)
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

func runReview(in *bufio.Scanner, l Lesson) (ok, done bool) {
	if l.Note != "" {
		fmt.Printf("PR notes: %s\n\n", l.Note)
	}
	code := l.Code
	if l.Type == "highlight" {
		code = strings.Replace(code, l.Highlight, "»"+l.Highlight+"«", 1)
	}
	fmt.Println(indent(code))
	fmt.Printf("\n%s\n\n", l.Question)
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

func kindLabel(k string) string {
	switch k {
	case "basics":
		return "Basics"
	case "syntax":
		return "Syntax"
	case "trap":
		return "Traps"
	case "reading":
		return "Reading"
	case "convention":
		return "Conventions"
	}
	return k
}
