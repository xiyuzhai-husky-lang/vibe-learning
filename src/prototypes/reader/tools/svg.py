"""Tiny SVG helpers for lesson figures. Colors are the page's CSS variables so both themes work."""
import hashlib

INK, MUTED, ACCENT, OK, BAD, PANEL, PANEL2, LINE = ("var(--ink)", "var(--muted)", "var(--accent)", "var(--ok)", "var(--bad)", "var(--panel)", "var(--panel-2)", "var(--line)")

class Fig:
    def __init__(self, w=560, h=220, label=""):
        self.w, self.h, self.label, self.parts = w, h, label, []
        self.mid = "a" + hashlib.md5(label.encode()).hexdigest()[:6]

    def rect(self, x, y, w, h, fill=PANEL, stroke=INK, rx=6, sw=1.2, dash=None, opacity=None):
        st = f"fill:{fill};stroke:{stroke};stroke-width:{sw}" + (f";stroke-dasharray:{dash}" if dash else "") + (f";opacity:{opacity}" if opacity else "")
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" style="{st}"/>')

    def text(self, x, y, s, size=13, anchor="middle", fill=INK, weight=None, mono=False):
        st = f"fill:{fill};font-size:{size}px" + (f";font-weight:{weight}" if weight else "") + (";font-family:ui-monospace,Menlo,monospace" if mono else "")
        self.parts.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" style="{st}">{s}</text>')

    def line(self, x1, y1, x2, y2, stroke=INK, sw=1.4, arrow=False, dash=None):
        st = f"stroke:{stroke};stroke-width:{sw};fill:none" + (f";stroke-dasharray:{dash}" if dash else "")
        m = f' marker-end="url(#{self.mid})"' if arrow else ""
        self.parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" style="{st}"{m}/>')

    def path(self, d, stroke=INK, sw=1.6, fill="none", dash=None, arrow=False):
        st = f"stroke:{stroke};stroke-width:{sw};fill:{fill}" + (f";stroke-dasharray:{dash}" if dash else "")
        m = f' marker-end="url(#{self.mid})"' if arrow else ""
        self.parts.append(f'<path d="{d}" style="{st}"{m}/>')

    def circle(self, cx, cy, r, fill=ACCENT, stroke=INK, sw=1.2):
        self.parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" style="fill:{fill};stroke:{stroke};stroke-width:{sw}"/>')

    def box(self, x, y, w, h, label, fill=PANEL, stroke=INK, size=13, weight=None, mono=False):
        self.rect(x, y, w, h, fill=fill, stroke=stroke)
        self.text(x + w / 2, y + h / 2 + size * 0.36, label, size=size, weight=weight, mono=mono,
                  fill=("var(--accent-ink)" if fill == ACCENT else INK))

    def render(self):
        defs = (f'<defs><marker id="{self.mid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
                f'<path d="M0,0 L10,5 L0,10 z" style="fill:{INK}"/></marker></defs>')
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" role="img" aria-label="{self.label}">'
                + defs + "".join(self.parts) + "</svg>")
