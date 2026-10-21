# Where decoding spends its time

A language model produces text one token at a time. Each token needs a full forward pass of the model at the newest position, with the earlier tokens available through the KV cache. The passes are strictly sequential: the next one cannot start until the token from the previous one is known, because that token is its input.

@figure autoregressive

## A model of one step

Let the model have $N$ parameters stored in 16 bits, so that the weights occupy $W = 2N$ bytes, and let the accelerator move $M$ bytes per second from memory and perform $F$ floating-point operations per second. A forward pass at one position multiplies by every weight matrix once, which costs about two operations per parameter, one multiply and one add.

**Proposition 1 (time of a step).** A decode step at $B$ positions reads the weights once and performs about $2NB$ operations. If the two overlap perfectly, the step takes
$$T(B) \;=\; \max\!\left(\frac{W}{M},\; \frac{2NB}{F}\right) \;=\; \frac{2N}{M}\,\max\!\left(1,\; \frac{B}{B^*}\right), \qquad B^* = \frac{F}{M}.$$

*Proof.* The weights are read once whatever $B$ is, because every position uses the same matrices; the arithmetic is $2N$ operations per position. The memory time is $W / M = 2N / M$ and the arithmetic time is $2NB / F$. Their ratio is $B M / F = B / B^*$, so the arithmetic time exceeds the memory time exactly when $B > B^*$. ∎

The step is **memory-bound** when $B < B^*$: its time is $2N / M$, set by bandwidth, and does not change with $B$. It is **compute-bound** when $B > B^*$: its time grows in proportion to $B$. The crossing point $B^* = F / M$ is the accelerator's operations per byte. It does not depend on $N$: a larger model takes longer per step but crosses over at the same $B$. It does depend on the weight precision, since the two bytes and the two operations per parameter cancelled; at 8-bit weights the crossing is at $F / (2M)$.

For a current accelerator with $M \approx 3.3$ TB/s and $F \approx 10^{15}$ operations per second, $B^* \approx 300$. For a 7B model, $W = 14$ GB:

| positions per step, $B$ | reading the weights | arithmetic | $T(B)$ | time per token, $T(B) / B$ |
|---|---|---|---|---|
| 1 | 4.2 ms | 0.014 ms | 4.2 ms | 4.2 ms |
| 8 | 4.2 ms | 0.11 ms | 4.2 ms | 0.53 ms |
| 64 | 4.2 ms | 0.9 ms | 4.2 ms | 0.066 ms |
| 300 | 4.2 ms | 4.2 ms | 4.2 ms | 0.014 ms |
| 1000 | 4.2 ms | 14 ms | 14 ms | 0.014 ms |

@figure step-bars

At batch one the arithmetic units are busy for a third of one percent of the step. Up to about three hundred positions the step does not get longer at all, and the cost per token falls as $1/B$; beyond that it levels off at $2N / F$, the arithmetic cost alone.

@figure roofline

**Corollary 1 (extra positions are free below $B^*$).** For $B \le B^*$, a step at $B$ positions costs the same as a step at one. In particular, a step at $\gamma + 1$ positions costs the same as a step at one whenever $\gamma + 1 \le B^*$.

*Proof.* $T(B) = 2N / M$ for every $B \le B^*$ by Proposition 1. ∎

## The KV cache

The weights are not the only thing read on every step. The attention of each layer reads the keys and values of every earlier token of the sequence. If a token's keys and values occupy $b$ bytes and the sequence has length $L$, a step at $B$ sequences reads $BLb$ further bytes, so the memory time becomes $(2N + BLb) / M$. The cache term grows with $B$ even in the memory-bound regime and with $L$ as the text gets longer; for short contexts it is small next to $2N$, for long ones it dominates, and the cost of a token is then set by the context length rather than by the model size. That is for $B$ different sequences. The $\gamma + 1$ positions of one speculative step belong to one sequence and share its cache, so they add only $Lb$, not $(\gamma + 1) L b$: the extra positions are free for the cache as well as for the weights. Nothing in this changes the conclusion for a single sequence at a short context: the step is a read of the weights, and the arithmetic is idle.

## What this leaves for one request

A server gets cheap tokens by filling the free room under $B^*$ with other users' requests: a step at a few hundred positions costs the same as a step at one, so each token costs a few hundred times less. A single request cannot do that. It runs at $B = 1$, and the accelerator could have handled $B^*$ positions in the time it spends on one.

Speculative decoding spends that room on the same request. A cheap draft model guesses the next $\gamma$ tokens, and the target checks all of them in one step at $\gamma + 1$ positions, which by Corollary 1 costs the same as a step at one. When the guesses are right, several tokens come out of one memory-bound step. The draft's own steps are memory-bound too, but its weights are a small fraction of the target's, so each costs a small fraction of a target step.

Two things have to hold for this to pay. The target must be in the memory-bound regime, which is true for one request and false on a loaded server. And the checking must not change what comes out: the next reading proves that it does not.
