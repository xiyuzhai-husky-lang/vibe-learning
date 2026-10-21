# Why the output is exactly the target's

Speculative decoding runs a cheap draft model ahead of the large target model and lets the target check several guesses in one pass. The claim that makes the method worth using is strong: the tokens that come out have exactly the distribution the target would have produced on its own. Not approximately, and not only when the draft is good. This reading shows why, one position at a time, with numbers small enough to check by hand.

## The setting

Fix a prefix. The target model gives a distribution $p$ over the next token; the draft gives $q$. Both are lists of numbers, one per vocabulary entry, summing to one. We can afford to compute $q$ many times and $p$ rarely, and we want samples from $p$.

Take a vocabulary of four tokens.

| token | $p$, the target | $q$, the draft |
|---|---|---|
| a | 0.50 | 0.30 |
| b | 0.30 | 0.50 |
| c | 0.15 | 0.10 |
| d | 0.05 | 0.10 |

@figure two-distributions

The draft is a reasonable guesser: it likes the same tokens the target likes. But it over-claims b and d and under-claims a and c.

## The rule

1. Sample a guess $x$ from the draft: $x \sim q$.
2. Compute $p$. The target has to do this pass anyway; the point is that it can do it for several positions at once.
3. Keep $x$ with probability $\min\!\left(1, \dfrac{p(x)}{q(x)}\right)$.
4. If $x$ is rejected, emit instead a sample from the residual distribution $r = \mathrm{norm}\big(\max(0,\, p - q)\big)$: the part of $p$ the draft under-claimed, scaled up to sum to one.

@figure one-position

In the example: a guess of a is always kept, since $p(a) \ge q(a)$. A guess of b survives with probability $0.3 / 0.5 = 0.6$. c is always kept. d survives with probability $0.05 / 0.10 = 0.5$.

## Where the probability goes

Look at one token $x$ and ask how often it comes out of the keep step. It is proposed with probability $q(x)$ and then kept with probability $\min(1, p(x)/q(x))$. Multiply:

$$q(x) \cdot \min\!\left(1, \frac{p(x)}{q(x)}\right) = \min\big(q(x),\, p(x)\big).$$

So the keep step emits each token at the rate $\min(p, q)$. Wherever the draft over-claims, the token is cut down to the target's rate; wherever it under-claims, the draft's full rate is kept because it is already below the target's. In the example the kept rates are 0.30, 0.30, 0.10 and 0.05.

@figure overlap

The kept rates sum to 0.75, so a guess is accepted 75 percent of the time. That is the acceptance rate $\alpha$ at this position. The remaining 25 percent is the rejection case.

What is missing from $p$ after the keep step? For each token, $p(x) - \min(p(x), q(x)) = \max(0,\, p(x) - q(x))$: 0.20 for a, nothing for b, 0.05 for c, nothing for d. These sum to 0.25, the same number as the rejection probability.

That is not a coincidence. For every token, $\min(p, q) + \max(0, p - q) = p$: if $q \le p$ the two terms are $q$ and $p - q$, and if $q > p$ they are $p$ and $0$. Summing over the vocabulary,

$$\sum_x \min(p, q) \;+\; \sum_x \max(0,\, p - q) \;=\; \sum_x p \;=\; 1,$$

so the rejection probability $1 - \alpha$ equals the total mass still owed, and the residual, which is that owed mass divided by $1 - \alpha$, is exactly the distribution of what the keep step failed to deliver.

## Adding it up

$$\Pr[\text{output} = x] \;=\; \underbrace{\min(p(x), q(x))}_{\text{kept}} \;+\; \underbrace{(1 - \alpha)\cdot\frac{\max(0,\, p(x) - q(x))}{1 - \alpha}}_{\text{rejected, then resampled}} \;=\; p(x).$$

Check it with the numbers.

| token | kept | resampled | total | $p$ |
|---|---|---|---|---|
| a | 0.30 | 0.25 × 0.80 = 0.20 | 0.50 | 0.50 |
| b | 0.50 × 0.6 = 0.30 | 0 | 0.30 | 0.30 |
| c | 0.10 | 0.25 × 0.20 = 0.05 | 0.15 | 0.15 |
| d | 0.10 × 0.5 = 0.05 | 0 | 0.05 | 0.05 |

The last two columns agree. Nothing in the argument used what $q$ is or where it came from. A bigram table, a tiny model, a model trained on the wrong language: the identity holds for any $q$. What $q$ changes is $\alpha$, how often the cheap guess survives, and therefore the speed. Never the output.

## Why the residual, and not simply $p$

Suppose that on rejection we sampled from $p$ itself. Token a would come out with probability $0.30 + 0.25 \times 0.50 = 0.425$ instead of 0.50, and token b with $0.30 + 0.25 \times 0.30 = 0.375$ instead of 0.30. The keep step had already delivered b at its full target rate, so any further b is too much; a was still short by 0.20 and received only 0.125. Sampling from $p$ counts the overlap a second time. The residual is $p$ with the overlap removed, which is precisely what is still owed. Any other replacement rule either over-delivers the draft's favourites or under-delivers the target's.

## From one position to a sequence

The draft produces $\gamma$ guesses in a row, each conditioned on the guesses before it. The target runs one pass over all of them and reports $p$ at every position. Now apply the rule from left to right.

Position 1 is the single-position case: the emitted token has distribution $p_1$. If the guess was kept, the guess at position 2 was drafted conditioned on exactly the prefix that now exists, and $p_2$ was computed for that same prefix, so the rule applies again. Continue until the first rejection. There the residual sample is the emitted token, and every later guess is thrown away: each was conditioned on a token that did not happen, so it is a sample from the wrong distribution and tells us nothing.

If all $\gamma$ guesses are kept, the target's pass has also produced $p_{\gamma + 1}$ for the position after the last guess, and one more token is sampled from it directly. That bonus token is a plain target sample, which is why an iteration can yield $\gamma + 1$ tokens.

@figure sequence

Every emitted token is therefore drawn from the target's distribution given the tokens actually emitted before it. That is the definition of sampling a sequence from the target. The guarantee holds for every $\gamma$; $\gamma$ only trades draft cost against how many tokens an iteration tends to yield.

## Greedy decoding

At temperature zero, $p$ puts all its mass on one token. The rule keeps the guess exactly when it is that token, and the residual on rejection is the target's argmax. The output is the target's greedy output, token for token, and $\alpha$ is the fraction of positions where the two models' argmaxes coincide.

## What the guarantee does not cover

- **Numerics.** The target computes $p$ for $\gamma + 1$ positions in one batched pass instead of one at a time. Kernels take different paths at different batch sizes, so logits can differ in their last bits. This is the same effect as changing the batch size on an ordinary server, not a property of the method.
- **Lossy variants.** Later methods sometimes relax step 3 to raise $\alpha$: keep any guess the target finds typical enough, or any guess in its top $k$. Those change the distribution by design. The rule above is the exact one, and it is what the original paper proves.
- **Bugs.** Resampling from $p$ instead of the residual, or keeping guesses after a rejection, breaks the identity in the ways shown above, and the output drifts toward the draft.

## Where this comes from

The keep step is a maximal coupling of $p$ and $q$. The overlap $\sum_x \min(p, q)$ equals $1 - \mathrm{TV}(p, q)$, the largest probability with which a sample from $q$ and a sample from $p$ can be made to agree, so the acceptance rate is the highest any exact scheme could reach with this draft. Underneath, the method is rejection sampling pointed at a new goal: produce the expensive model's sample mostly out of the cheap model's.
