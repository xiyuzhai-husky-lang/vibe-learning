#!/usr/bin/env python3
"""Assemble the Splash architecture course from draft files.

Usage: SPLASH_REPO=/path/to/splash@be3b083 python3 assemble.py draft1.json draft2.json ...

Each draft is a JSON array of lessons with: id, kind, title, question, correct, wrong[2],
explanation, files[], and optionally code, file, language. Every files[] path must exist in
the checkout and any code must be an exact substring of its file. Choices are shuffled
deterministically by lesson id; lessons are ordered by the kinds in course.json.
"""
import hashlib, json, os, random, re, sys

here = os.path.dirname(os.path.abspath(__file__))
repo = os.environ.get("SPLASH_REPO")
if not repo or not os.path.isdir(repo):
    sys.exit("set SPLASH_REPO to a checkout at the pinned commit")
course = json.load(open(os.path.join(here, "course.json")))
kinds = [k["id"] for k in course["kinds"]]

out, seen, errors = [], set(), []
for path in sys.argv[1:]:
    for d in json.load(open(path)):
        lid = d["id"]
        def bad(msg): errors.append(f"{lid}: {msg}")
        if lid in seen: bad("duplicate id")
        seen.add(lid)
        if d["kind"] not in kinds: bad(f"unknown kind {d['kind']}")
        for f in d.get("files", []):
            if not os.path.isfile(os.path.join(repo, f)): bad(f"missing file {f}")
        code = d.get("code") or ""
        if code:
            src = open(os.path.join(repo, d["file"])).read() if d.get("file") and os.path.isfile(os.path.join(repo, d["file"])) else ""
            if code not in src: bad("code is not a verbatim excerpt of file")
            if not 1 <= code.count("\n") + 1 <= 12: bad("code must be 1-12 lines")
        choices = [d["correct"]] + list(d["wrong"])
        if len(choices) != 3: bad("needs exactly three choices")
        if any(len(c) > 64 for c in choices): bad("choice over 64 chars")
        if len(d["correct"]) - max(len(c) for c in d["wrong"]) > 10: bad("correct choice is the longest")
        if len(re.findall(r"[.!?](\s|$)", d["explanation"].strip())) > 2: bad("explanation over two sentences")
        if re.search(r"[一-鿿]", json.dumps(d, ensure_ascii=False)): bad("non-English text")
        r = random.Random(int(hashlib.md5(lid.encode()).hexdigest(), 16)); r.shuffle(choices)
        lesson = {"id": lid, "kind": d["kind"], "title": d["title"], "question": d["question"]}
        if d.get("context"):
            lesson["context"] = d["context"].strip()
        # Architecture lessons carry no code: the excerpt was checked above as evidence for the
        # reviewer, but the learner answers from the question alone and verifies via files[].
        lesson["files"] = sorted(set(d.get("files", []) + ([d["file"]] if code and d.get("file") else [])))
        lesson.update(choices=choices, answer=choices.index(d["correct"]), explanation=d["explanation"].strip())
        out.append(lesson)
if errors:
    sys.exit("\n".join(errors))
out.sort(key=lambda l: kinds.index(l["kind"]))
with open(os.path.join(here, "lessons.json"), "w") as f:
    json.dump(out, f, indent=2, ensure_ascii=False); f.write("\n")
from collections import Counter
print(len(out), dict(Counter(l["kind"] for l in out)))
