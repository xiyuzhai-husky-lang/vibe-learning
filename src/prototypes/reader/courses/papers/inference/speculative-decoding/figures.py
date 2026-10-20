"""Figures for the speculative decoding course. Each returns SVG markup; FIGURES maps lesson ids to them."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..", "tools"))
from svg import Fig, INK, MUTED, ACCENT, OK, BAD, PANEL, PANEL2, LINE

def autoregressive():
    f = Fig(560, 150, "Autoregressive decoding: one full pass per token")
    toks = ["The", "cat", "sat", "on", "?"]
    for i, t in enumerate(toks):
        x = 20 + i * 108
        f.box(x, 55, 70, 34, t, fill=(PANEL2 if t == "?" else PANEL), mono=True)
        if i < len(toks) - 1:
            f.rect(x + 76, 40, 26, 64, fill=PANEL2, stroke=MUTED, rx=4)
            for k in range(4):
                f.line(x + 80, 47 + k * 14, x + 98, 47 + k * 14, stroke=MUTED, sw=1)
            f.text(x + 89, 122, "full pass", size=10, fill=MUTED)
    f.text(280, 24, "Each new token needs one full pass of the model over the prefix", size=12, fill=MUTED)
    return f.render()

def step_bars():
    f = Fig(560, 170, "Where a decode step's time goes at small and large batch")
    def row(y, label, read, arith):
        f.text(20, y + 14, label, size=12, anchor="start", weight=600)
        f.text(110, y + 14, "reading weights", size=11, anchor="end", fill=MUTED)
        f.rect(120, y + 2, read, 16, fill=ACCENT, stroke="none", rx=3)
        f.text(110, y + 40, "arithmetic", size=11, anchor="end", fill=MUTED)
        f.rect(120, y + 28, arith, 16, fill=OK, stroke="none", rx=3)
    row(30, "batch 1", 400, 8)
    row(100, "batch 64", 400, 380)
    f.text(120, 162, "time per step, same weights read once in both cases", size=11, anchor="start", fill=MUTED)
    return f.render()

def roofline():
    f = Fig(560, 220, "Time per step against batch size: memory-bound then compute-bound")
    ox, oy, W, H = 60, 180, 460, 140
    f.line(ox, oy, ox + W, oy, arrow=True); f.line(ox, oy, ox, oy - H, arrow=True)
    f.text(ox + W / 2, oy + 24, "batch size (positions per pass)", size=12, fill=MUTED)
    f.text(18, oy - H / 2, "time", size=12, fill=MUTED)
    f.line(ox, oy - 60, ox + W - 10, oy - 60, stroke=ACCENT, sw=2)
    f.text(ox + 8, oy - 66, "reading the weights: flat", size=11, anchor="start", fill=ACCENT)
    f.path(f"M{ox},{oy-4} L{ox + W - 10},{oy - 126}", stroke=OK, sw=2)
    f.text(ox + W - 14, oy - 118, "arithmetic: grows", size=11, anchor="end", fill=OK)
    cx = ox + 215
    f.line(cx, oy, cx, oy - 130, stroke=MUTED, sw=1, dash="4 3")
    f.text(cx - 8, oy - 136, "memory-bound", size=11, anchor="end", fill=MUTED)
    f.text(cx + 8, oy - 136, "compute-bound", size=11, anchor="start", fill=MUTED)
    return f.render()

def iteration():
    f = Fig(560, 215, "One iteration: draft proposes, target verifies in one pass, accept a prefix")
    f.text(20, 24, "prefix", size=11, anchor="start", fill=MUTED)
    for i in range(3):
        f.box(20 + i * 46, 32, 40, 28, "", fill=PANEL2, stroke=MUTED)
    f.text(176, 24, "draft proposes gamma = 4", size=11, anchor="start", fill=ACCENT)
    for i in range(4):
        f.box(176 + i * 46, 32, 40, 28, f"g{i+1}", fill=PANEL, stroke=ACCENT, mono=True)
    f.text(380, 24, "+1", size=11, anchor="start", fill=MUTED)
    f.box(380, 32, 40, 28, "", fill=PANEL2, stroke=MUTED)
    f.path("M176,72 L176,80 L420,80 L420,72", stroke=INK, sw=1.2)
    f.text(298, 96, "target: one pass over 5 positions", size=11, fill=INK)
    f.text(20, 136, "verdict", size=11, anchor="start", fill=MUTED)
    for i, v in enumerate(["ok", "ok", "no", "-"]):
        x = 176 + i * 46 + 20
        col = OK if v == "ok" else BAD if v == "no" else MUTED
        f.text(x, 140, {"ok": "accept", "no": "reject", "-": "dropped"}[v], size=10, fill=col)
    f.text(20, 192, "output", size=11, anchor="start", fill=MUTED)
    f.box(176, 170, 40, 28, "g1", fill=PANEL, stroke=OK, mono=True)
    f.box(222, 170, 40, 28, "g2", fill=PANEL, stroke=OK, mono=True)
    f.box(268, 170, 40, 28, "t", fill=PANEL, stroke=BAD, mono=True)
    f.text(314, 188, "<- drawn from the target at the rejected position", size=10, anchor="start", fill=MUTED)
    return f.render()

def acceptance():
    f = Fig(560, 230, "Draft q against target p for a few tokens: accepted mass and residual")
    ox, oy = 60, 180
    f.line(ox, oy, 520, oy); f.line(ox, oy, ox, 30)
    toks = [("a", 0.45, 0.25), ("b", 0.20, 0.35), ("c", 0.25, 0.10), ("d", 0.10, 0.30)]
    for i, (t, q, p) in enumerate(toks):
        x = ox + 30 + i * 110
        f.rect(x, oy - q * 300, 34, q * 300, fill=MUTED, stroke="none", rx=2, opacity=0.5)
        f.rect(x + 40, oy - p * 300, 34, p * 300, fill=ACCENT, stroke="none", rx=2)
        m = min(p, q)
        f.rect(x, oy - m * 300, 34, m * 300, fill=OK, stroke="none", rx=2)
        if p > q:
            f.rect(x + 40, oy - p * 300, 34, (p - q) * 300, fill="none", stroke=BAD, sw=1.4, dash="3 2", rx=0)
        f.text(x + 37, oy + 16, t, size=12, mono=True)
    f.rect(ox, 36, 12, 12, fill=MUTED, stroke="none", rx=2, opacity=0.5); f.text(ox + 18, 46, "draft q", size=11, anchor="start")
    f.rect(ox + 90, 36, 12, 12, fill=ACCENT, stroke="none", rx=2); f.text(ox + 108, 46, "target p", size=11, anchor="start")
    f.rect(ox + 190, 36, 12, 12, fill=OK, stroke="none", rx=2); f.text(ox + 208, 46, "min(p, q): kept", size=11, anchor="start")
    f.rect(ox + 320, 36, 12, 12, fill="none", stroke=BAD, dash="3 2", rx=0); f.text(ox + 338, 46, "p - q > 0: residual", size=11, anchor="start")
    return f.render()

def yield_curve():
    f = Fig(560, 230, "Expected tokens per iteration against gamma for three acceptance rates")
    ox, oy, W, H = 60, 190, 440, 150
    f.line(ox, oy, ox + W, oy, arrow=True); f.line(ox, oy, ox, oy - H, arrow=True)
    f.text(ox + W / 2, oy + 24, "gamma (tokens drafted per iteration)", size=12, fill=MUTED)
    f.text(8, 34, "tokens per", size=10, anchor="start", fill=MUTED); f.text(8, 46, "iteration", size=10, anchor="start", fill=MUTED)
    ymax = 10
    for g in range(0, 9):
        f.text(ox + g * 50, oy + 12, str(g), size=10, fill=MUTED)
    for yv in (2, 4, 6, 8, 10):
        y = oy - yv / ymax * H
        f.line(ox - 4, y, ox, y, stroke=MUTED); f.text(ox - 8, y + 4, str(yv), size=10, anchor="end", fill=MUTED)
    for a, col in ((0.5, MUTED), (0.7, OK), (0.9, ACCENT)):
        pts = []
        for g in range(0, 9):
            v = (1 - a ** (g + 1)) / (1 - a)
            pts.append((ox + g * 50, oy - v / ymax * H))
        f.path("M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts), stroke=col, sw=2)
        f.text(pts[-1][0] + 6, pts[-1][1] + 4, f"alpha {a}", size=11, anchor="start", fill=col)
    return f.render()

FIGURES = {
    "def-autoregressive": autoregressive(), "problem-one-token-per-pass": autoregressive(),
    "def-memory-bound": step_bars(), "problem-memory-bound": step_bars(), "problem-idle-compute": step_bars(),
    "def-compute-bound": roofline(), "assume-large-batch": roofline(), "after-limit": roofline(),
    "def-gamma": iteration(), "def-target-draft": iteration(), "idea-parallel-pass": iteration(),
    "after-splash": iteration(),
    "def-residual": acceptance(), "why-thinning": acceptance(), "why-residual": acceptance(),
    "why-alpha": yield_curve(), "assume-gamma": yield_curve(), "def-acceptance-rate": yield_curve(),
}
