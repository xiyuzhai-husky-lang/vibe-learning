package main

import (
	_ "embed"
	"encoding/json"
	"log"
	"strings"
)

// Lesson is one exercise. Two types, both single-choice:
//   - "highlight" basics: a Go snippet with one marked span; the choices say in plain words what it is.
//   - "review"    a senior engineer reviews production code: approve, or request changes for which reason.
//
// Lessons live in lessons.json, shared by the CLI and the web server.
type Lesson struct {
	ID    string `json:"id"`
	Type  string `json:"type"` // highlight | review
	Kind  string `json:"kind"` // basics | syntax | trap | reading | convention
	Title string `json:"title"`

	Note        string   `json:"note,omitempty"`      // review: optional PR notes
	Code        string   `json:"code"`                // valid Go
	Highlight   string   `json:"highlight,omitempty"` // highlight: a substring that occurs exactly once in Code
	Question    string   `json:"question"`
	Choices     []string `json:"choices"`
	Answer      int      `json:"answer"`
	Explanation string   `json:"explanation"`
}

//go:embed lessons.json
var lessonsJSON []byte

var validKinds = map[string]bool{"basics": true, "syntax": true, "trap": true, "reading": true, "convention": true}

var lessons = mustLoadLessons()

func mustLoadLessons() []Lesson {
	var ls []Lesson
	if err := json.Unmarshal(lessonsJSON, &ls); err != nil {
		log.Fatalf("parse lessons.json: %v", err)
	}
	seen := map[string]bool{}
	for i := range ls {
		l := &ls[i]
		if seen[l.ID] {
			log.Fatalf("duplicate lesson ID %q", l.ID)
		}
		seen[l.ID] = true
		if l.Type == "" {
			l.Type = "review"
		}
		if !validKinds[l.Kind] {
			log.Fatalf("lesson %q: invalid kind %q", l.ID, l.Kind)
		}
		if l.Answer < 0 || l.Answer >= len(l.Choices) {
			log.Fatalf("lesson %q: answer out of range", l.ID)
		}
		switch l.Type {
		case "review":
		case "highlight":
			if n := strings.Count(l.Code, l.Highlight); l.Highlight == "" || n != 1 {
				log.Fatalf("lesson %q: highlight must occur exactly once in code, found %d", l.ID, n)
			}
		default:
			log.Fatalf("lesson %q: invalid type %q", l.ID, l.Type)
		}
	}
	return ls
}

func findLesson(id string) (Lesson, bool) {
	for _, l := range lessons {
		if l.ID == id {
			return l, true
		}
	}
	return Lesson{}, false
}
