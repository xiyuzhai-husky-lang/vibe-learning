package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// publicCourse is a catalog entry: enough to list it and to link to it.
type publicCourse struct {
	ID      string   `json:"id"`
	Title   string   `json:"title"`
	Tagline string   `json:"tagline"`
	Source  string   `json:"source,omitempty"`
	Count   int      `json:"count"`
	Related []string `json:"related"` // ids of the courses to see next
}

// publicCategory is one node of the catalog tree as the client sees it.
type publicCategory struct {
	ID       string           `json:"id"`
	Label    string           `json:"label"`
	Children []publicCategory `json:"children"`
	Courses  []publicCourse   `json:"courses"`
}

func toPublicCourse(c *Course) publicCourse {
	return publicCourse{ID: c.ID, Title: c.Title, Tagline: c.Tagline, Source: c.Source, Count: len(c.Lessons), Related: c.Related}
}

func toPublicCategory(cat *Category) publicCategory {
	out := publicCategory{ID: cat.ID, Label: cat.Label, Children: []publicCategory{}, Courses: []publicCourse{}}
	for _, ch := range cat.Children {
		out.Children = append(out.Children, toPublicCategory(ch))
	}
	for _, c := range cat.Courses {
		out.Courses = append(out.Courses, toPublicCourse(c))
	}
	return out
}

// publicLesson is what the client gets: no answer, no explanation. Grading happens here.
type publicLesson struct {
	ID        string   `json:"id"`
	Kind      string   `json:"kind"`
	Title     string   `json:"title"`
	File      string   `json:"file,omitempty"`
	Files     []string `json:"files,omitempty"`
	Language  string   `json:"language"`
	Code      string   `json:"code,omitempty"`
	Highlight string   `json:"highlight,omitempty"`
	Context   string   `json:"context,omitempty"`
	Figure    string   `json:"figure,omitempty"`
	Question  string   `json:"question"`
	Choices   []string `json:"choices"`
}

type courseResponse struct {
	ID       string         `json:"id"`
	Title    string         `json:"title"`
	Tagline  string         `json:"tagline"`
	Source   string         `json:"source,omitempty"`
	Path     []Kind         `json:"path"`     // categories from the root down: the breadcrumb
	Related  []publicCourse `json:"related"`  // see also
	Readings []Reading      `json:"readings"` // read before the lessons
	Kinds    []Kind         `json:"kinds"`
	Lessons  []publicLesson `json:"lessons"`
}

// progressResponse restores what the learner already did in a course. The explanation is
// included only for lessons already attempted, since the learner has seen it.
type progressEntry struct {
	LessonProgress
	Explanation string `json:"explanation"`
}

type answerRequest struct {
	Course string `json:"course"`
	ID     string `json:"id"`
	Choice int    `json:"choice"`
}

// answerResponse never reveals the answer index: the learner may pick again after a miss.
type answerResponse struct {
	Correct     bool           `json:"correct"`
	Explanation string         `json:"explanation"`
	Progress    LessonProgress `json:"progress"`
}

func toPublic(c *Course, l Lesson) publicLesson {
	lang := l.Language
	if lang == "" {
		lang = c.Language
	}
	return publicLesson{
		ID: l.ID, Kind: l.Kind, Title: l.Title, File: l.File, Files: l.Files, Language: lang,
		Code: l.Code, Highlight: l.Highlight, Context: l.Context, Figure: l.Figure, Question: l.Question, Choices: l.Choices,
	}
}

func serve(addr, webDir, dataDir string) {
	store := openProgress(dataDir)
	log.Printf("learner data in %s", dataDir)
	mux := http.NewServeMux()

	// The whole catalog tree: the table of contents of the encyclopedia.
	mux.HandleFunc("GET /api/courses", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, toPublicCategory(catalog))
	})

	mux.HandleFunc("GET /api/courses/{id}", func(w http.ResponseWriter, r *http.Request) {
		c, ok := courses[r.PathValue("id")]
		if !ok {
			http.Error(w, "no such course", http.StatusNotFound)
			return
		}
		resp := courseResponse{ID: c.ID, Title: c.Title, Tagline: c.Tagline, Source: c.Source, Kinds: c.Kinds,
			Path: []Kind{}, Related: []publicCourse{}, Readings: c.Readings, Lessons: []publicLesson{}}
		for _, cat := range c.Path[1:] { // skip the unnamed root
			resp.Path = append(resp.Path, Kind{ID: cat.ID, Label: cat.Label})
		}
		for _, id := range c.Related {
			resp.Related = append(resp.Related, toPublicCourse(courses[id]))
		}
		for _, l := range c.Lessons {
			resp.Lessons = append(resp.Lessons, toPublic(c, l))
		}
		writeJSON(w, http.StatusOK, resp)
	})

	mux.HandleFunc("GET /api/progress/{id}", func(w http.ResponseWriter, r *http.Request) {
		c, ok := courses[r.PathValue("id")]
		if !ok {
			http.Error(w, "no such course", http.StatusNotFound)
			return
		}
		out := map[string]progressEntry{}
		for id, p := range store.course(c.ID) {
			if l, ok := c.findLesson(id); ok {
				out[id] = progressEntry{LessonProgress: *p, Explanation: l.Explanation}
			}
		}
		writeJSON(w, http.StatusOK, out)
	})

	mux.HandleFunc("DELETE /api/progress/{id}", func(w http.ResponseWriter, r *http.Request) {
		if _, ok := courses[r.PathValue("id")]; !ok {
			http.Error(w, "no such course", http.StatusNotFound)
			return
		}
		store.reset(r.PathValue("id"))
		w.WriteHeader(http.StatusNoContent)
	})

	mux.HandleFunc("POST /api/answer", func(w http.ResponseWriter, r *http.Request) {
		var req answerRequest
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}
		c, ok := courses[req.Course]
		if !ok {
			http.Error(w, "no such course", http.StatusNotFound)
			return
		}
		l, ok := c.findLesson(req.ID)
		if !ok {
			http.Error(w, "no such lesson", http.StatusNotFound)
			return
		}
		if req.Choice < 0 || req.Choice >= len(l.Choices) {
			http.Error(w, "choice out of range", http.StatusBadRequest)
			return
		}
		correct := req.Choice == l.Answer
		p := store.record(c.ID, l.ID, req.Choice, correct)
		writeJSON(w, http.StatusOK, answerResponse{Correct: correct, Explanation: l.Explanation, Progress: p})
	})

	// Static files: serve the Vite build in web/dist; unknown paths fall back to index.html.
	if st, err := os.Stat(webDir); err == nil && st.IsDir() {
		fs := http.FileServer(http.Dir(webDir))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			p := filepath.Join(webDir, filepath.Clean("/"+r.URL.Path))
			if st, err := os.Stat(p); err == nil && !st.IsDir() {
				fs.ServeHTTP(w, r)
				return
			}
			http.ServeFile(w, r, filepath.Join(webDir, "index.html"))
		})
		log.Printf("serving frontend from %s", webDir)
	} else {
		log.Printf("%s not found, serving the API only (in dev, run npm run dev and proxy /api)", webDir)
	}

	log.Printf("listening on http://%s", strings.Replace(addr, "0.0.0.0", "localhost", 1))
	log.Fatal(http.ListenAndServe(addr, mux))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("write response: %v", err)
	}
}
