#!/usr/bin/env python3
"""Definitions group for the Splash course: the terms the questions rely on. Run to merge into lessons.json."""
import hashlib, json, os, random

here = os.path.dirname(os.path.abspath(__file__))
T = []
def term(id, title, question, correct, wrong, explanation, files):
    T.append(dict(id=id, title=title, question=question, correct=correct, wrong=wrong, explanation=explanation, files=files))

term("def-prefill-decode", "Prefill and decode", "What are prefill and decode?",
  "Running the prompt through the model, then tokens one by one",
  ["Loading the weights, then warming the GPU with a dummy run", "Tokenizing the prompt, then detokenizing the model's output"],
  "Prefill processes the whole prompt in large chunks to build its cache; decode then runs a step per new token, which is the memory-bound phase speculative decoding speeds up.",
  ["DEVELOPMENT.md"])
term("def-kv-page", "KV page", "What is a KV page in Splash?",
  "Keys and values of 32 consecutive tokens, the cache unit",
  ["One attention layer's keys and values for the whole prompt", "A 16 KiB block of weights the attention kernels read"],
  "Attention KV is stored in fixed 32-token pages that are allocated, shared, evicted and addressed as units; a prompt becomes a chain of pages.",
  ["runtime/engine/KvCache.hpp", "runtime/ops/PagedKv.hpp"])
term("def-prefix-cache", "Prefix cache", "What is the prefix cache?",
  "Pages kept after a request so a same-start prompt skips prefill",
  ["A copy of each client's last prompt text, keyed by its API key", "The tokenizer's cache of recently seen prompt strings and ids"],
  "Pages are content-addressed by their exact tokens and parent page, so any later prompt that begins the same way finds and reuses them.",
  ["runtime/engine/Cache.cpp", "runtime/engine/KvCache.hpp"])
term("def-lane", "Lane", "What is a lane?",
  "A slot for one running request, with its own state buffers",
  ["One Metal command queue reserved for a single request", "One thread of the Python server handling one connection"],
  "Attention KV lives in shared pages, but each running request also needs private buffers for its recurrent GDN state and draft context; the lane holds them and the batch is a few lanes wide.",
  ["runtime/model/StateLayout.hpp", "runtime/engine/Scheduler.hpp"])
term("def-recurrent-state", "Recurrent state", "What is a request's recurrent state?",
  "The fixed-size memory of the GDN layers at a point in the prompt",
  ["The KV pages of every attention layer up to that same point", "The sampler's random seed and its repetition penalty counters"],
  "Both supported families are hybrids: most layers are gated delta net recurrences whose state is a fixed-size cell, not a growing KV; a resume needs that cell at the resume point.",
  ["runtime/engine/Cache.hpp", "runtime/model/QwenHybridLayout.hpp"])
term("def-restore-point", "Restore point", "What is a restore point?",
  "A cached recurrent state at a page where a later request resumes",
  ["The byte offset in the SSD file where a page was written", "The last token before the model's context limit is reached"],
  "Matched KV alone cannot be resumed from in a hybrid model, so the cache keeps composite states at chosen pages; a follow-up turn resumes from the deepest one on its chain.",
  ["runtime/engine/Cache.hpp", "runtime/engine/StateCache.cpp"])
term("def-admission", "Admission", "What is admission in the engine?",
  "Deciding whether a waiting request may start, given the memory",
  ["Checking the client's API key before a request is accepted", "Choosing which lane's tokens are streamed to the client first"],
  "Between GPU commands the scheduler admits waiting requests in order, giving each a lane and the memory its prompt needs, or refusing and holding the line behind it.",
  ["runtime/engine/Engine.cpp", "runtime/engine/Scheduler.cpp"])
term("def-frame", "Frame", "What is a frame in the server-engine protocol?",
  "One typed binary message on the engine's stdin or stdout",
  ["One HTTP chunk of the server's streaming response body", "One 32-token page of KV sent between the two processes"],
  "The Python server and the C++ engine exchange length-prefixed frames (requests and masks in, Ready, Start, Tokens and Done events out); nothing else crosses between them.",
  ["runtime/engine/Protocol.hpp", "server/protocol.py"])
term("def-draft", "Draft (DFlash)", "What is the draft in Splash?",
  "A small model proposing tokens the target verifies all at once",
  ["A quantized copy of the target used when memory runs short", "A cache of the model's most frequent next tokens per prompt"],
  "DFlash reads the target's captured hidden states and proposes seven tokens per cycle; the target verifies all of them in one pass and keeps the accepted prefix, which is speculative decoding.",
  ["runtime/model/DFlashDraft.hpp", "runtime/metal/abi/ExecutionGeometry.h"])
term("def-mask", "Token mask", "What is a token mask?",
  "A bitmask over the vocabulary: which tokens the grammar allows",
  ["A list of tokens the client asked the model never to produce", "The attention mask that hides padding positions in a batch"],
  "For constrained output the server compiles a grammar and answers the engine's mask requests with one allowed-token bitmask per position, which the sampler applies.",
  ["server/constraints.py", "runtime/engine/Protocol.hpp"])
term("def-extent", "Extent", "What is an extent?",
  "A large Metal buffer of many KV pages, allocated as a unit",
  ["One page's worth of KV written out to the SSD tier file", "The region of a weight image that one layer's kernels read"],
  "The pool grows and shrinks by extents of about 128 MiB; page table entries point into them, so kernels reach any page by address without binding buffers.",
  ["runtime/engine/KvPool.cpp", "runtime/metal/kernels/common/kv_extent.h"])
term("def-ssd-tier", "SSD tier", "What is the SSD tier?",
  "Disk that takes evicted cache states and pages, not dropping",
  ["A copy of the model weights kept on disk for faster restarts", "The directory where the server logs every request it serves"],
  "When memory reclaim evicts a restore point and the KV it needs, the IO worker writes them to the cache file so a later prompt can restore them rather than recompute.",
  ["runtime/engine/KvPageTier.cpp", "runtime/engine/WriteBehind.cpp"])

path = os.path.join(here, "lessons.json")
lessons = [l for l in json.load(open(path)) if l["kind"] != "definitions"]
out = []
for t in T:
    choices = [t["correct"]] + t["wrong"]
    r = random.Random(int(hashlib.md5(t["id"].encode()).hexdigest(), 16)); r.shuffle(choices)
    out.append({"id": t["id"], "kind": "definitions", "title": t["title"], "question": t["question"], "files": t["files"],
                "choices": choices, "answer": choices.index(t["correct"]), "explanation": t["explanation"]})
with open(path, "w") as f:
    json.dump(out + lessons, f, indent=2, ensure_ascii=False); f.write("\n")
print(len(out), "definitions,", len(out) + len(lessons), "lessons")
