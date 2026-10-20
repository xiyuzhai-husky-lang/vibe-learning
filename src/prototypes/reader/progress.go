package main

import (
	"encoding/json"
	"errors"
	"log"
	"os"
	"path/filepath"
	"sync"
)

// Learner data never enters the repository: it lives in .local/ at the repository root
// (gitignored), or wherever -data points. The browser keeps nothing but the theme.

// LessonProgress is what the learner did on one lesson. Picks are never locked, so wrong
// picks accumulate until the right one; the score counts lessons solved with no wrong pick.
type LessonProgress struct {
	Wrong  []int `json:"wrong"`
	Solved *int  `json:"solved,omitempty"` // the correct choice, once picked
}

type progressStore struct {
	mu   sync.Mutex
	file string
	data map[string]map[string]*LessonProgress // course id -> lesson id -> progress
}

func openProgress(dir string) *progressStore {
	s := &progressStore{file: filepath.Join(dir, "progress.json"), data: map[string]map[string]*LessonProgress{}}
	b, err := os.ReadFile(s.file)
	switch {
	case errors.Is(err, os.ErrNotExist):
	case err != nil:
		log.Fatalf("read %s: %v", s.file, err)
	default:
		if err := json.Unmarshal(b, &s.data); err != nil {
			log.Fatalf("parse %s: %v", s.file, err)
		}
	}
	return s
}

// defaultDataDir is .local/ at the root of the enclosing git repository, or ./.local outside one.
func defaultDataDir() string {
	dir, err := os.Getwd()
	if err != nil {
		return ".local"
	}
	for d := dir; ; d = filepath.Dir(d) {
		if _, err := os.Stat(filepath.Join(d, ".git")); err == nil {
			return filepath.Join(d, ".local")
		}
		if filepath.Dir(d) == d {
			return filepath.Join(dir, ".local")
		}
	}
}

func (s *progressStore) course(id string) map[string]*LessonProgress {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := map[string]*LessonProgress{}
	for k, v := range s.data[id] {
		cp := *v
		out[k] = &cp
	}
	return out
}

// record stores one graded pick and returns the lesson's progress afterwards.
func (s *progressStore) record(course, lesson string, choice int, correct bool) LessonProgress {
	s.mu.Lock()
	defer s.mu.Unlock()
	m := s.data[course]
	if m == nil {
		m = map[string]*LessonProgress{}
		s.data[course] = m
	}
	p := m[lesson]
	if p == nil {
		p = &LessonProgress{Wrong: []int{}}
		m[lesson] = p
	}
	if p.Solved == nil {
		if correct {
			c := choice
			p.Solved = &c
		} else {
			p.Wrong = append(p.Wrong, choice)
		}
	}
	s.saveLocked()
	return *p
}

func (s *progressStore) reset(course string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data, course)
	s.saveLocked()
}

func (s *progressStore) saveLocked() {
	if err := os.MkdirAll(filepath.Dir(s.file), 0o755); err != nil {
		log.Printf("progress: %v", err)
		return
	}
	b, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		log.Printf("progress: %v", err)
		return
	}
	tmp := s.file + ".tmp"
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		log.Printf("progress: %v", err)
		return
	}
	if err := os.Rename(tmp, s.file); err != nil {
		log.Printf("progress: %v", err)
	}
}
