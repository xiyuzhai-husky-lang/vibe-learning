#!/usr/bin/env python3
"""Lessons for the speculative decoding paper (arXiv 2211.17192). Run to regenerate lessons.json."""
import hashlib, json, os, random

L = []
def lesson(id, kind, title, question, correct, wrong, explanation, refs, context=None):
    L.append(dict(id=id, kind=kind, title=title, question=question, correct=correct, wrong=wrong, explanation=explanation, refs=refs, context=context))

# The problem
lesson("problem-one-token-per-pass", "problem", "One token per pass",
  "Why does a large model's decode step produce only one token, when the hardware could do far more arithmetic in that time?",
  "Each token depends on the previous one, so steps cannot overlap",
  ["The KV cache must be rewritten before another token can start", "The sampler needs the full vocabulary sorted before each token"],
  "Autoregressive decoding is sequential by definition: the next input is the token just produced, so the model is called once per token however idle the arithmetic units are.",
  ["Section 1"],
  context="Decoding a transformer is autoregressive: each new token needs a full forward pass over the prefix, and that pass must read every weight from memory. At the batch sizes of interactive serving a step moves tens of gigabytes of weights to produce one token, so the step is bound by memory bandwidth and the arithmetic units sit mostly idle. A smaller model is faster but changes the output. Many tokens in a sequence are easy: a far smaller model predicts them just as the large one would; a few are hard. Plain decoding does not exploit the difference: every token, easy or hard, costs one full pass of the large model.")
lesson("problem-memory-bound", "problem", "Where the time goes",
  "At batch size one, what does the time of a decode step mostly go to?",
  "Streaming the weights from memory into the chips",
  ["Multiplying the prefix's activations by the weights", "Sorting the vocabulary to sample the next token"],
  "One token's worth of arithmetic is tiny next to reading every weight once, so the step is memory-bound; that idle arithmetic is what speculative decoding spends.",
  ["Section 1"])
lesson("problem-smaller-model", "problem", "Why not the small model",
  "A small model predicts most tokens exactly as the large one would. Why not simply serve the small model?",
  "The hard tokens are where its answers differ and matter",
  ["Small models cannot run at batch size one", "A smaller model is no faster once it fits in memory"],
  "Quality lives in the minority of hard tokens; the paper's goal is to keep the large model's output exactly while paying the large model's price only where it is needed.",
  ["Section 1"])
lesson("problem-idle-compute", "problem", "What is left unused",
  "What does memory-bound decoding leave unused that a speedup could spend?",
  "Arithmetic: the chips could handle more positions per pass",
  ["Bandwidth: the weights could be streamed faster", "The KV cache, which is read only at the final layer"],
  "Running the same weights over several positions at once costs little more than one position while the weights are the bottleneck, which is exactly the room the method uses.",
  ["Section 1", "Section 3.4"])

# The idea
lesson("idea-parallel-pass", "idea", "One pass, many positions",
  "Why does the target's single pass over gamma plus one positions cost about the same as a pass over one position?",
  "The step is memory-bound; the same weights serve every position",
  ["Positions after the first reuse the first one's attention", "The draft already computed most of the activations"],
  "Reading the weights dominates the step, and they are read once however many positions are in the batch, so verifying several guesses is nearly free until the arithmetic becomes the bottleneck.",
  ["Section 2.1", "Section 3.4"],
  context="Speculative decoding keeps the large target model and adds a cheap approximation model, the draft, which shares the target's vocabulary. Each iteration the draft runs autoregressively a few times, gamma times, producing gamma guessed tokens. The target then runs once over the prefix plus all gamma guesses in parallel, which yields its next-token distribution at every one of those positions in a single pass. The guesses are checked left to right against the target's distributions; the first rejected guess is replaced by a token drawn from the target, and everything after it is discarded. If every guess survives, one more token comes from the target's last distribution. So an iteration costs one target pass plus gamma cheap draft steps and yields between one and gamma plus one tokens.")
lesson("idea-draft-sequential", "idea", "Why the draft runs step by step",
  "Why must the draft produce its gamma guesses one after another rather than in a single parallel pass?",
  "Each guess conditions on the guess before it",
  ["Parallel drafting would need the target's KV cache", "The acceptance test needs the tokens in order"],
  "The draft is an ordinary autoregressive model proposing a continuation, so guess k is sampled given guesses one to k minus one; only the target's check is parallel.",
  ["Section 2.1", "Algorithm 1"])
lesson("idea-always-progress", "idea", "Always at least one token",
  "Why does an iteration always make progress, even when the draft's very first guess is rejected?",
  "The rejection itself yields a token drawn from the target",
  ["The first guess is accepted by rule, whatever the target says", "A failed iteration is retried with a smaller gamma"],
  "On rejection the method samples the replacement from the target's adjusted distribution at that position, so the worst case is one target-quality token per iteration, the same as plain decoding.",
  ["Section 2.1", "Algorithm 1"])
lesson("idea-bonus-token", "idea", "The extra token",
  "All gamma guesses were accepted. Why can the iteration add one more token at no extra cost?",
  "The target's pass already covered one position past the guesses",
  ["The draft runs one extra step while the target finishes", "Accepted guesses prove the draft right, so it gets one more"],
  "The target was run on gamma plus one positions, the last being the position after the final guess, so its distribution there is available and one token is sampled from it directly.",
  ["Section 2.1", "Algorithm 1"])
lesson("idea-no-retraining", "idea", "Nothing is retrained",
  "What makes this usable with an existing large model today?",
  "The target is unchanged; only its sampling loop changes",
  ["The target needs a short fine-tune on the draft's output", "The target is distilled once into the draft"],
  "The method wraps the target's forward pass and sampling; the draft can be any existing smaller model with the same vocabulary, so no training is needed on either side.",
  ["Section 1", "Section 2"])

# Why it works
lesson("why-thinning", "why-it-works", "Why thin rather than trust",
  "Why accept a guess with probability p(x)/q(x) when the draft over-claims it, rather than always accepting the draft's likely tokens?",
  "It cuts tokens the draft over-claims down to the target's rate",
  ["It saves target compute on the draft's confident guesses", "It keeps the draft from drifting away from the target"],
  "A token proposed with probability q(x) and kept with probability p(x)/q(x) comes out with probability p(x), which is exactly the target's rate for it.",
  ["Section 2.3", "Appendix A.1"],
  context="A guess x drawn from the draft distribution q is accepted outright when q(x) is at most p(x), the target's probability for it. Otherwise it is kept with probability p(x) divided by q(x). When a guess is rejected, the replacement is drawn not from p but from the adjusted distribution: p minus q, clipped at zero and renormalized. Accepting where the draft under-claims, thinning where it over-claims, and filling the rejected mass with exactly what the target wanted and the draft did not supply makes each output token distributed exactly as if the target had sampled it alone. The rule needs nothing from the draft except its probabilities, so the draft can be any model, even a bigram table. With temperature zero both distributions are one-hot and the rule reduces to keeping a guess exactly when the two models' argmax agree.")
lesson("why-residual", "why-it-works", "The replacement on rejection",
  "What would go wrong if a rejected guess were replaced by a plain sample from the target's distribution p?",
  "The output would no longer be distributed as the target's",
  ["Rejections would happen more often than they need to", "The draft could never be rejected twice in a row"],
  "Accepted guesses already account for the mass where the draft under-claims; sampling the rest from p would count that mass twice, so the replacement must come from the residual p minus q.",
  ["Section 2.3", "Appendix A.1"])
lesson("why-any-draft", "why-it-works", "Any draft will do",
  "Why does the exactness guarantee hold for any draft, even a bigram table?",
  "The rule reads only the draft's probabilities",
  ["A weak draft is rejected on every guess, so the target decides", "The target re-scores the draft before trusting it"],
  "The proof uses nothing about how q was produced, only its values; a poor draft lowers the acceptance rate and the speedup, never the correctness of the output.",
  ["Section 2.3", "Appendix A.1"])
lesson("why-greedy", "why-it-works", "The greedy case",
  "With temperature zero, when is a draft guess kept?",
  "Exactly when the two models' argmax agree",
  ["Whenever the target gives it any probability at all", "Always; greedy decoding has nothing to reject"],
  "At temperature zero both p and q are one-hot, so p(x)/q(x) is one when the argmaxes match and zero otherwise, and the method degrades to plain argmax decoding with lookahead.",
  ["Section 2.2", "Section 2.3"])
lesson("why-alpha", "why-it-works", "What sets the yield",
  "What single property of the draft determines how many tokens an iteration yields on average?",
  "How often the target accepts its guesses",
  ["How many parameters it has relative to the target", "How fast it runs relative to the target"],
  "The paper calls it alpha, the expected acceptance probability; tokens per iteration depend on alpha and gamma alone, while the draft's speed enters only the wall-clock cost.",
  ["Section 3.1", "Section 3.2"])

# Assumptions and costs
lesson("assume-compute-rises", "assumptions", "More arithmetic per token",
  "Why does speculative decoding spend more arithmetic per token than plain decoding, even though it is faster?",
  "Rejected positions were computed by the target and thrown away",
  ["The draft recomputes the whole prefix on every iteration", "The acceptance test runs over the entire vocabulary"],
  "The target evaluates gamma plus one positions each iteration but keeps fewer on average, and the draft's steps are extra; the method buys latency with compute that was idle anyway.",
  ["Section 3.4"],
  context="The method trades arithmetic for latency. An iteration does the work of gamma plus one target positions and gamma draft steps but yields fewer tokens than that on average, so total compute per token rises; the wall-clock gain exists only while the hardware has arithmetic to spare, which is the memory-bound regime of small batches. Two numbers govern the gain: the acceptance rate alpha, the probability that the target accepts a draft guess, and the cost coefficient c, the draft step's time as a fraction of the target's. The expected tokens per iteration is (1 - alpha^(gamma+1)) / (1 - alpha), and the expected speedup divides that by gamma c + 1. The draft and target must share a vocabulary. The best gamma depends on alpha and c: a better draft rewards longer speculation, a costlier draft punishes it.")
lesson("assume-large-batch", "assumptions", "When the GPU is full",
  "A server runs batches large enough to saturate the GPU's arithmetic. What happens to the speedup?",
  "It shrinks toward nothing: there is no idle compute to spend",
  ["It grows, since more sequences share one draft", "It stays the same; batch size is not in the formula"],
  "The extra positions were free only because the weights, not the arithmetic, were the bottleneck; once compute-bound, verifying gamma positions costs gamma times as much.",
  ["Section 3.4", "Section 6"])
lesson("assume-gamma", "assumptions", "Why not a huge gamma",
  "Why not always speculate with a very large gamma?",
  "Late guesses rarely survive but still cost draft steps",
  ["The target can verify only a fixed number of positions", "Longer runs make the acceptance test inexact"],
  "The chance that guess k survives falls like alpha to the k, so past some point each extra draft step adds cost and almost no tokens; the optimal gamma rises with alpha and falls with c.",
  ["Section 3.5"])
lesson("assume-vocabulary", "assumptions", "Same tokenizer",
  "Why must the draft share the target's tokenizer?",
  "Acceptance compares both models' probability of one token",
  ["The draft writes directly into the target's KV cache", "Different vocabularies would need two prompts"],
  "The rule compares p(x) and q(x) for the same symbol x, which only means something when both models speak the same vocabulary.",
  ["Section 2.3"])
lesson("assume-cost-coefficient", "assumptions", "A slow draft",
  "The draft is nearly as slow as the target, so c is close to one. What follows?",
  "Little or no gain: drafting costs about what it saves",
  ["The gain is unchanged as long as alpha stays high", "The method becomes exact only in this regime"],
  "The speedup is the tokens per iteration divided by gamma c + 1; with c near one the gamma draft steps cost as much as gamma target steps would have.",
  ["Section 3.3"])

# Results and limits
lesson("results-no-quality-metric", "results", "No quality metric needed",
  "Why can the paper report speedups without reporting any quality metric?",
  "The outputs are distributed exactly as the target's own",
  ["Quality was measured and found slightly higher", "Translation metrics are too noisy to show a change"],
  "Exactness is proved, not measured: with the same seed the decoded text is the target's, so only wall-clock time is left to compare.",
  ["Section 4", "Appendix A.1"],
  context="The paper measures on T5-XXL, an eleven-billion-parameter encoder-decoder, with the small members of the same family as drafts, on English-to-German translation and on summarization, with greedy decoding and with sampling at temperature one. No model is retrained and the outputs are the target's own. Wall-clock speedups fall between two and three and a half times, higher for greedy decoding than for sampling and higher on translation than on summarization. A tiny GPT-like model with a bigram table as its draft also gains, modestly. The gains are on hardware that was memory-bound for the target alone.")
lesson("results-greedy-vs-sampling", "results", "Greedy gains more",
  "Why is the speedup larger for greedy decoding than for sampling at temperature one?",
  "Argmax agreement is more likely than a sampled match",
  ["Greedy decoding skips the acceptance test entirely", "Sampling forces the paper to use a smaller gamma"],
  "With temperature the two models must draw the same token from spread-out distributions, which happens less often than their argmaxes coinciding, so alpha and the yield are lower.",
  ["Section 4", "Table 1"])
lesson("results-task", "results", "Translation versus summarization",
  "Why would translation gain more than summarization?",
  "The draft agrees with the target more often there",
  ["Translation outputs are shorter, so fewer iterations", "Summarization needs a larger vocabulary"],
  "A more constrained task leaves fewer plausible next tokens, so a small model matches the large one more often and alpha is higher.",
  ["Section 4", "Table 1"])
lesson("results-bigram", "results", "Even a bigram helps",
  "Even a bigram table as draft gave a small speedup. What does that show?",
  "Any guesser with the right vocabulary helps if cheap",
  ["Small transformers are unnecessary as drafts", "The target was weaker than expected on that data"],
  "A draft that costs almost nothing has c near zero, so even a low acceptance rate pays; the method is a framework for spending idle compute, not a particular small model.",
  ["Section 4"])

# What followed
lesson("after-medusa", "aftermath", "Medusa",
  "Medusa keeps the target but drops the separate draft model. What did it keep from this paper?",
  "One target pass over many guesses, exact acceptance",
  ["A draft trained on the target's own outputs", "Guessing from a bigram table of the prompt"],
  "Later methods change only where guesses come from, here extra heads on the target; the verify-in-one-pass step and the acceptance rule are this paper's.",
  ["Section 6"],
  context="The acceptance rule became the standard way to make speculative methods exact, and later work changed only where the guesses come from. Medusa grows extra heads on the target to guess several positions without a second model; EAGLE drafts from the target's hidden features instead of its tokens; tree-structured verification checks several candidate continuations in one target pass. Production engines adopted it: Splash's DFlash draft proposes seven tokens per cycle and the target verifies eight rows in one pass, keeping the min(1, p/q) acceptance. The limit the paper named stayed: once serving is compute-bound, the free parallel slots are gone.")
lesson("after-features", "aftermath", "Drafting from features",
  "Why might drafting from the target's hidden features beat drafting from its tokens?",
  "Features carry what sampling a token threw away",
  ["Features are cheaper to store than tokens", "Token drafts cannot use the KV cache"],
  "A sampled token is one draw from a whole distribution; the hidden state behind it still holds the alternatives, so a draft fed with it guesses more like the target.",
  ["Section 6"])
lesson("after-tree", "aftermath", "Trees of candidates",
  "Why verify a tree of candidate continuations rather than one chain?",
  "More ways to be right per target pass, at compute cost",
  ["A single chain cannot be verified in one pass", "Trees make the acceptance rule unnecessary"],
  "A pass over more positions is still nearly free while memory-bound, so checking several branches raises the expected accepted length for the same target call.",
  ["Section 3.4", "Section 6"])
lesson("after-splash", "aftermath", "Inside Splash",
  "Splash verifies eight rows per decode step with a draft that proposes seven. Which part of this paper is that?",
  "Gamma guesses plus the bonus position in one target pass",
  ["A draft retrained on the target's outputs every night", "Rejecting a whole batch when any lane disagrees"],
  "Seven proposals and the position after them make gamma plus one rows, verified together; acceptance walks them left to right with the paper's rule.",
  ["Section 2.1"])
lesson("after-limit", "aftermath", "Where it stops helping",
  "Why do throughput-oriented servers with huge batches rarely use speculative decoding?",
  "Their GPUs are compute-bound; nothing is idle",
  ["Large batches make acceptance rates fall", "Drafts cannot be batched across requests"],
  "The method converts idle arithmetic into latency; a saturated GPU has none to convert, and the extra positions then cost real time.",
  ["Section 3.4", "Section 6"])

out = []
for l in L:
    choices = [l["correct"]] + l["wrong"]
    r = random.Random(int(hashlib.md5(l["id"].encode()).hexdigest(), 16)); r.shuffle(choices)
    d = {"id": l["id"], "kind": l["kind"], "title": l["title"]}
    if l["context"]: d["context"] = l["context"]
    d.update(question=l["question"], files=l["refs"], choices=choices, answer=choices.index(l["correct"]), explanation=l["explanation"])
    out.append(d)
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "lessons.json"), "w") as f:
    json.dump(out, f, indent=2, ensure_ascii=False); f.write("\n")
print(len(out))
