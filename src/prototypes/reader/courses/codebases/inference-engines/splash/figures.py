"""Figures for the Splash course. Run after definitions.py: attaches SVG figures to lessons by id."""
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(here, "..", "..", "..", "..", "tools"))
from svg import Fig, INK, MUTED, ACCENT, OK, BAD, PANEL, PANEL2, LINE

def two_processes():
    f = Fig(560, 200, "Client, Python server, C++ engine and GPU")
    f.box(20, 90, 80, 40, "client", fill=PANEL2, stroke=MUTED)
    f.line(100, 110, 136, 110, arrow=True); f.text(118, 102, "HTTP", size=10, fill=MUTED)
    f.rect(140, 40, 160, 150, fill=PANEL, stroke=ACCENT, sw=1.6)
    f.text(220, 62, "Python server", size=13, weight=600, fill=ACCENT)
    for i, s in enumerate(["HTTP and API shapes", "tokenizer, templates", "grammars and masks", "output parsing"]):
        f.text(220, 88 + i * 22, s, size=11)
    f.line(300, 100, 346, 100, arrow=True); f.line(346, 120, 300, 120, arrow=True)
    f.text(323, 92, "frames", size=10, fill=MUTED); f.text(323, 136, "stdin/stdout", size=10, fill=MUTED)
    f.rect(350, 40, 150, 150, fill=PANEL, stroke="var(--tok-function)", sw=1.6)
    f.text(425, 62, "C++ engine", size=13, weight=600, fill="var(--tok-function)")
    for i, s in enumerate(["scheduler, admission", "KV and state caches", "model and kernels"]):
        f.text(425, 88 + i * 22, s, size=11)
    f.line(500, 110, 536, 110, arrow=True)
    f.box(505, 150, 40, 30, "GPU", fill=PANEL2, stroke=MUTED, size=11)
    f.line(425, 190, 425, 150 + 60, stroke="none")
    return f.render()

def page_tree():
    f = Fig(560, 180, "Prompts as chains of 32-token pages sharing a prefix")
    f.text(20, 24, "prompt A and prompt B share their first three pages", size=11, anchor="start", fill=MUTED)
    for i in range(3):
        f.box(20 + i * 90, 60, 70, 34, f"page {i+1}", fill=ACCENT, stroke="none", size=11)
        if i < 2: f.line(90 + i * 90, 77, 110 + i * 90, 77, arrow=True)
    f.line(270, 77, 300, 50, arrow=True); f.line(270, 77, 300, 104, arrow=True)
    f.box(304, 32, 70, 34, "page 4", fill=PANEL, stroke=ACCENT, size=11); f.text(384, 54, "A", size=11, anchor="start")
    f.box(304, 88, 70, 34, "page 4'", fill=PANEL, stroke=ACCENT, size=11); f.text(384, 110, "B", size=11, anchor="start")
    f.box(404, 32, 70, 34, "page 5", fill=PANEL, stroke=ACCENT, size=11); f.line(374, 49, 400, 49, arrow=True)
    f.text(20, 160, "filled: pages both prompts use; outlined: each prompt's own continuation", size=11, anchor="start", fill=MUTED)
    return f.render()

def restore_points():
    f = Fig(560, 180, "A page chain with cached recurrent states at two pages")
    for i in range(6):
        x = 20 + i * 88
        f.box(x, 50, 68, 34, f"page {i+1}", fill=(ACCENT if i < 5 else PANEL2), stroke=("none" if i < 5 else MUTED), size=11)
        if i < 5: f.line(x + 68, 67, x + 86, 67, arrow=True)
    for i in (1, 3):
        x = 20 + i * 88 + 34
        f.circle(x, 118, 11, fill=OK, stroke="none"); f.text(x, 122, "S", size=11, fill="var(--accent-ink)", weight=600)
        f.line(x, 84, x, 106, stroke=OK, sw=1.4)
    f.text(20, 160, "KV pages matched through page 5; cached recurrent states S at pages 2 and 4", size=11, anchor="start", fill=MUTED)
    return f.render()

def draft_verify():
    f = Fig(560, 170, "Seven proposals plus the anchor: eight rows verified in one pass")
    f.text(20, 24, "anchor", size=11, anchor="start", fill=MUTED)
    f.box(20, 32, 46, 30, "a", fill=PANEL2, stroke=MUTED, mono=True)
    f.text(76, 24, "draft proposes seven", size=11, anchor="start", fill=ACCENT)
    for i in range(7):
        f.box(76 + i * 56, 32, 46, 30, f"p{i+1}", fill=PANEL, stroke=(OK if i < 3 else ACCENT), mono=True)
    f.path("M20,72 L20,80 L458,80 L458,72", stroke=INK, sw=1.2)
    f.text(239, 98, "target verifies all eight rows in one decode command", size=11)
    f.text(20, 140, "accepted prefix in green; the rest is overwritten by the next command", size=11, anchor="start", fill=MUTED)
    return f.render()

FIGURES = {
    "def-frame": two_processes(), "map-native-contents": two_processes(),
    "def-kv-page": page_tree(), "def-prefix-cache": page_tree(), "state-content-addressed": page_tree(), "invariants-page-unit": page_tree(),
    "def-recurrent-state": restore_points(), "def-restore-point": restore_points(), "state-hybrid-needs-state": restore_points(),
    "def-draft": draft_verify(), "state-draft-window": draft_verify(),
}

if __name__ == "__main__":
    path = os.path.join(here, "lessons.json")
    L = json.load(open(path))
    ids = {l["id"] for l in L}
    missing = [k for k in FIGURES if k not in ids]
    if missing: sys.exit(f"no such lessons: {missing}")
    n = 0
    for l in L:
        l.pop("figure", None)
        if l["id"] in FIGURES: l["figure"] = FIGURES[l["id"]]; n += 1
    with open(path, "w") as f:
        json.dump(L, f, indent=2, ensure_ascii=False); f.write("\n")
    print(n, "figures attached")
