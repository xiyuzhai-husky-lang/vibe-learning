package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// publicLesson is what the client gets: no answer, no explanation. Grading happens here.
type publicLesson struct {
	ID        string   `json:"id"`
	Type      string   `json:"type"`
	Kind      string   `json:"kind"`
	Title     string   `json:"title"`
	Note      string   `json:"note,omitempty"`
	Code      string   `json:"code"`
	Highlight string   `json:"highlight,omitempty"`
	Question  string   `json:"question"`
	Choices   []string `json:"choices"`
}

type answerRequest struct {
	ID     string `json:"id"`
	Choice int    `json:"choice"`
}

// answerResponse never reveals the answer on a wrong pick: the learner may pick again.
// The explanation comes only with the correct pick.
type answerResponse struct {
	Correct     bool   `json:"correct"`
	Explanation string `json:"explanation,omitempty"`
}

func toPublic(l Lesson) publicLesson {
	return publicLesson{
		ID: l.ID, Type: l.Type, Kind: l.Kind, Title: l.Title,
		Note: l.Note, Code: l.Code, Highlight: l.Highlight, Question: l.Question, Choices: l.Choices,
	}
}

func serve(addr, webDir string) {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/lessons", func(w http.ResponseWriter, r *http.Request) {
		out := make([]publicLesson, 0, len(lessons))
		for _, l := range lessons {
			out = append(out, toPublic(l))
		}
		writeJSON(w, http.StatusOK, out)
	})

	mux.HandleFunc("POST /api/answer", func(w http.ResponseWriter, r *http.Request) {
		var req answerRequest
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}
		l, ok := findLesson(req.ID)
		if !ok {
			http.Error(w, "no such lesson", http.StatusNotFound)
			return
		}
		if req.Choice < 0 || req.Choice >= len(l.Choices) {
			http.Error(w, "choice out of range", http.StatusBadRequest)
			return
		}
		resp := answerResponse{Correct: req.Choice == l.Answer}
		if resp.Correct {
			resp.Explanation = l.Explanation
		}
		writeJSON(w, http.StatusOK, resp)
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
