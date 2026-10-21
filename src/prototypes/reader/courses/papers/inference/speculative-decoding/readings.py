"""Figures for the readings of the speculative decoding course: writes readings/<name>.svg.
A reading refers to one with a line "@figure <name>". Run after editing; the Go loader inlines them."""
import os
from figures import autoregressive, step_bars, roofline, Fig, INK, MUTED, ACCENT, OK, BAD, PANEL, PANEL2, LINE

TOKENS = ["a", "b", "c", "d"]
P = [0.50, 0.30, 0.15, 0.05]
Q = [0.30, 0.50, 0.10, 0.10]
SCALE = 240  # pixels per unit of probability

def two_distributions():
    f = Fig(560, 230, "The target's distribution p and the draft's q over four tokens")
    base = 190
    f.rect(20, 18, 12, 12, fill=ACCENT, stroke="none", rx=2); f.text(38, 29, "p, the target", size=12, anchor="start")
    f.rect(150, 18, 12, 12, fill=MUTED, stroke="none", rx=2); f.text(168, 29, "q, the draft", size=12, anchor="start")
    for i, t in enumerate(TOKENS):
        x = 60 + i * 125
        for j, (v, col) in enumerate(((P[i], ACCENT), (Q[i], MUTED))):
            bx = x + j * 40
            f.rect(bx, base - v * SCALE, 34, v * SCALE, fill=col, stroke="none", rx=3)
            f.text(bx + 17, base - v * SCALE - 6, f"{v:.2f}", size=11, fill=col)
        f.text(x + 37, base + 20, t, size=14, mono=True, weight=600)
    f.line(40, base, 540, base, stroke=LINE, sw=1)
    return f.render()

def overlap():
    f = Fig(560, 250, "Per token: what the accept step keeps, what it cuts, what is still owed")
    base = 200
    for i, t in enumerate(TOKENS):
        x = 50 + i * 110
        p, q = P[i], Q[i]
        kept = min(p, q)
        f.rect(x, base - kept * SCALE, 60, kept * SCALE, fill=OK, stroke="none", rx=3)
        f.text(x + 30, base - kept * SCALE / 2 + 4, f"{kept:.2f}", size=11, fill="var(--accent-ink)")
        if q > p:
            f.rect(x, base - q * SCALE, 60, (q - p) * SCALE, fill=BAD, stroke="none", rx=3, opacity=0.35)
            f.text(x + 30, base - q * SCALE - 6, f"cut {q - p:.2f}", size=11, fill=BAD)
        if p > q:
            f.rect(x, base - p * SCALE, 60, (p - q) * SCALE, fill="none", stroke=ACCENT, rx=3, dash="4 3")
            f.text(x + 30, base - p * SCALE - 6, f"owed {p - q:.2f}", size=11, fill=ACCENT)
        f.text(x + 30, base + 20, t, size=14, mono=True, weight=600)
    f.line(40, base, 480, base, stroke=LINE, sw=1)
    f.rect(500, 60, 12, 12, fill=OK, stroke="none", rx=2); f.text(500, 90, "kept", size=11, anchor="start")
    f.text(500, 104, "min(p, q)", size=11, anchor="start", fill=MUTED)
    f.text(500, 118, "sum 0.75", size=11, anchor="start", fill=MUTED)
    f.rect(500, 136, 12, 12, fill="none", stroke=ACCENT, rx=2, dash="3 2"); f.text(500, 166, "owed", size=11, anchor="start")
    f.text(500, 180, "max(0, p−q)", size=11, anchor="start", fill=MUTED)
    f.text(500, 194, "sum 0.25", size=11, anchor="start", fill=MUTED)
    return f.render()

def one_position():
    f = Fig(560, 210, "One position: draft proposes, target checks, residual on rejection")
    f.box(20, 30, 130, 44, "draft: x ~ q", fill=PANEL, mono=True)
    f.line(150, 52, 190, 52, arrow=True)
    f.box(192, 30, 150, 44, "target: compute p", fill=PANEL, mono=True)
    f.line(342, 52, 382, 52, arrow=True)
    f.rect(384, 20, 156, 64, fill=PANEL2, stroke=INK)
    f.text(462, 44, "keep x with prob", size=12)
    f.text(462, 66, "min(1, p(x)/q(x))", size=12, mono=True)
    f.line(462, 84, 462, 118, stroke=OK, sw=1.6, arrow=True)
    f.text(472, 104, "yes", size=11, anchor="start", fill=OK)
    f.box(392, 120, 140, 40, "emit x", fill=OK, stroke="none", mono=True)
    f.path("M400,84 L400,100 L265,100 L265,118", stroke=BAD, sw=1.6, arrow=True)
    f.text(257, 114, "no", size=11, anchor="end", fill=BAD)
    f.rect(150, 120, 230, 64, fill=PANEL2, stroke=BAD)
    f.text(265, 144, "sample from the residual", size=12)
    f.text(265, 166, "norm(max(0, p − q))", size=12, mono=True)
    f.text(265, 202, "and emit it", size=11, fill=MUTED)
    return f.render()

def sequence():
    f = Fig(560, 230, "Two iterations with gamma = 4: stop at the first rejection, or take a bonus token")
    def row(y, label, marks, tail):
        f.text(20, y + 20, label, size=11, anchor="start", fill=MUTED)
        for i, (name, mark) in enumerate(marks):
            x = 150 + i * 70
            col = {"ok": OK, "bad": BAD, "drop": MUTED}[mark]
            f.rect(x, y, 56, 32, fill=PANEL, stroke=col, dash=("4 3" if mark == "drop" else None))
            f.text(x + 28, y + 21, name, size=12, mono=True, fill=(MUTED if mark == "drop" else INK))
            f.text(x + 28, y + 48, {"ok": "accepted", "bad": "rejected", "drop": "discarded"}[mark], size=10, fill=col)
        x = 150 + len(marks) * 70
        f.rect(x, y, 56, 32, fill=ACCENT, stroke="none")
        f.text(x + 28, y + 21, tail[0], size=12, mono=True, fill="var(--accent-ink)")
        f.text(x + 28, y + 48, tail[1], size=10, fill=ACCENT)
    row(30, "first rejected at 3", [("g1", "ok"), ("g2", "ok"), ("g3", "bad"), ("g4", "drop")], ("r", "from residual"))
    f.text(150, 108, "output: g1 g2 r, three tokens from one target pass", size=11, anchor="start")
    row(140, "all accepted", [("g1", "ok"), ("g2", "ok"), ("g3", "ok"), ("g4", "ok")], ("+1", "bonus from p"))
    f.text(150, 218, "output: g1 g2 g3 g4 and one more, five tokens from one pass", size=11, anchor="start")
    return f.render()

FIGURES = {
    "autoregressive": autoregressive, "step-bars": step_bars, "roofline": roofline,
    "two-distributions": two_distributions, "overlap": overlap, "one-position": one_position, "sequence": sequence,
}

if __name__ == "__main__":
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "readings")
    for name, draw in FIGURES.items():
        with open(os.path.join(out, name + ".svg"), "w") as fh:
            fh.write(draw() + "\n")
    print(f"wrote {len(FIGURES)} figures")
