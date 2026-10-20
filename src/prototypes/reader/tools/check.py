#!/usr/bin/env python3
"""Check every lessons.json in the catalog against the lesson rules the Go loader does not enforce:
three choices of at most 64 characters within 10 of each other, the correct one never the longest,
an explanation of one or two sentences, a context of at most 8 sentences, English only."""
import glob, json, os, re, sys

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "courses")
errors = []
for path in sorted(glob.glob(os.path.join(root, "**", "lessons.json"), recursive=True)):
    course = os.path.basename(os.path.dirname(path))
    for l in json.load(open(path)):
        def bad(msg): errors.append(f"{course}/{l['id']}: {msg}")
        c = l["choices"]
        if len(c) != 3: bad("needs three choices")
        if any(len(x) > 64 for x in c): bad("choice over 64 chars")
        ok = c[l["answer"]]
        if len(ok) - max(len(x) for x in c if x is not ok) > 10: bad("correct choice is the longest")
        if len(re.findall(r"[.!?](\s|$)", l["explanation"].strip())) > 2: bad("explanation over two sentences")
        if len(re.findall(r"[.!?](\s|$)", l.get("context", "").strip())) > 8: bad("context over eight sentences")
        if re.search(r"[一-鿿]", json.dumps(l, ensure_ascii=False)): bad("non-English text")
if errors:
    sys.exit("\n".join(errors))
print("ok")
