# Why the output is exactly the target's

Speculative decoding lets a cheap draft model guess several tokens ahead and lets the large target model check all of them in one pass. The claim that makes the method worth using is strong: the tokens that come out have exactly the distribution the target would have produced on its own, whatever the draft is. This reading proves that claim, first for one position, then for each position of a multi-token iteration, then for the whole generation, and finally shows that the acceptance rate it achieves is the best any exact scheme can have.

## Setting and notation

Let $V$ be the finite vocabulary and fix a prefix $s$. The target defines a distribution $p(\cdot) = p(\cdot \mid s)$ on $V$ and the draft defines $q(\cdot) = q(\cdot \mid s)$. For a real number $a$ write $a^+ = \max(a, 0)$. Define

$$\beta \;=\; \sum_{x \in V} \min\big(p(x),\, q(x)\big), \qquad r(x) \;=\; \frac{\big(p(x) - q(x)\big)^+}{\sum_{y \in V} \big(p(y) - q(y)\big)^+}.$$

$\beta$ will turn out to be the probability that a draft guess is accepted at this position. The quantity $(p(x) - q(x))^+$ is the mass the draft owes the target at $x$, the owed mass, and $r$, the residual distribution, is the owed mass scaled to sum to one; it is what replaces a rejected guess. $r$ is defined when its denominator is positive, which Lemma 2 shows is exactly the case $\beta < 1$; when $\beta = 1$ no rejection ever occurs and $r$ is not needed. The paper writes $\alpha$ for the expectation of $\beta$ over prefixes; the lessons call $\alpha$ the acceptance rate.

A running example with four tokens:

| token | $p$, the target | $q$, the draft |
|---|---|---|
| a | 0.50 | 0.30 |
| b | 0.30 | 0.50 |
| c | 0.15 | 0.10 |
| d | 0.05 | 0.10 |

@figure two-distributions

Here $\beta = 0.30 + 0.30 + 0.10 + 0.05 = 0.75$, the owed masses $(p - q)^+$ are $0.20, 0, 0.05, 0$, and $r = (0.8, 0, 0.2, 0)$.

## The procedure at one position

1. Draw a guess $x \sim q$.
2. Draw $u$ uniformly from $[0, 1]$. If $u < \min\!\left(1, \dfrac{p(x)}{q(x)}\right)$, accept: the output is $x$.
3. Otherwise reject: the output is a fresh draw $y \sim r$.

Step 2 never divides by zero, because $x$ was drawn from $q$, so $q(x) > 0$. The three draws $x$, $u$ and $y$ are independent.

@figure one-position

In the example, a is always accepted since $p(a) \ge q(a)$; b is accepted with probability $0.30 / 0.50 = 0.6$; c always; d with probability $0.05 / 0.10 = 0.5$.

## One position

**Lemma 1 (kept mass).** For every $x \in V$,
$$\Pr[\text{accept and output } x] \;=\; \min\big(p(x), q(x)\big).$$

*Proof.* If $q(x) = 0$ the token is never drawn and both sides are $0$. Otherwise the event is the intersection of $\{x \text{ is drawn}\}$ and $\{u < \min(1, p(x)/q(x))\}$; the two draws are independent, so the probability is the product
$$q(x) \cdot \min\!\left(1, \frac{p(x)}{q(x)}\right).$$
If $q(x) \le p(x)$ the minimum is $1$ and the product is $q(x) = \min(p(x), q(x))$. If $q(x) > p(x)$ the minimum is $p(x)/q(x)$ and the product is $p(x) = \min(p(x), q(x))$. ∎

**Lemma 2 (the accepted and the owed mass add to one).** $\Pr[\text{accept}] = \beta$, and
$$\sum_{x \in V} \big(p(x) - q(x)\big)^+ \;=\; 1 - \beta.$$
In particular $r$ is a probability distribution whenever $\beta < 1$, and $\beta = 1$ exactly when $p = q$.

*Proof.* Summing Lemma 1 over $x$ gives $\Pr[\text{accept}] = \beta$. For the identity, take any $x$. If $q(x) \le p(x)$ then $\min(p(x), q(x)) = q(x)$ and $(p(x) - q(x))^+ = p(x) - q(x)$; if $q(x) > p(x)$ then $\min(p(x), q(x)) = p(x)$ and $(p(x) - q(x))^+ = 0$. In both cases
$$\min\big(p(x), q(x)\big) + \big(p(x) - q(x)\big)^+ \;=\; p(x).$$
Summing over $V$ and using $\sum_x p(x) = 1$ gives $\beta + \sum_x (p(x) - q(x))^+ = 1$. The denominator of $r$ is therefore $1 - \beta$, positive when $\beta < 1$, and $r$ is nonnegative and sums to one. Finally $\beta = 1$ means $(p - q)^+ = 0$ everywhere, that is $p \le q$ pointwise; since both sum to one this forces $p = q$; conversely $p = q$ gives $\beta = \sum_x p(x) = 1$. ∎

@figure overlap

**Theorem 1 (one position is exact).** Let $X$ be the output of the procedure. Then for every $x \in V$ and every draft distribution $q$,
$$\Pr[X = x] \;=\; p(x).$$

*Proof.* The two branches are exclusive, so
$$\Pr[X = x] \;=\; \Pr[\text{accept and } X = x] \;+\; \Pr[\text{reject and } X = x].$$
The first term is $\min(p(x), q(x))$ by Lemma 1. If $\beta = 1$ then $p = q$ by Lemma 2, rejection never happens, and the first term is already $p(x)$. Otherwise $\Pr[\text{reject}] = 1 - \beta > 0$ by Lemma 2, and on rejection $X$ is the draw $y \sim r$, independent of $(x, u)$, so the second term is $(1 - \beta)\, r(x)$. Hence
$$\begin{aligned}
\Pr[X = x] \;&=\; \min\big(p(x), q(x)\big) + (1 - \beta) \cdot \frac{\big(p(x) - q(x)\big)^+}{1 - \beta} \\
&=\; \min\big(p(x), q(x)\big) + \big(p(x) - q(x)\big)^+ \;=\; p(x),
\end{aligned}$$
the last step being the pointwise identity from the proof of Lemma 2. ∎

The proof used nothing about $q$ beyond its being a distribution. A bigram table, a tiny model or a model of the wrong language all give the exact output; they differ in $\beta$ and hence in speed.

Checking the example against the theorem:

| token | accepted, $\min(p, q)$ | rejected then redrawn, $(1 - \beta)\, r$ | total | $p$ |
|---|---|---|---|---|
| a | 0.30 | 0.25 × 0.8 = 0.20 | 0.50 | 0.50 |
| b | 0.50 × 0.6 = 0.30 | 0 | 0.30 | 0.30 |
| c | 0.10 | 0.25 × 0.2 = 0.05 | 0.15 | 0.15 |
| d | 0.10 × 0.5 = 0.05 | 0 | 0.05 | 0.05 |

**Proposition 1 (the replacement must be $r$).** Suppose $\beta < 1$ and that on rejection the output is drawn, independently of the rejected guess, from a fixed distribution $r'$ instead of $r$. Then the output has law $\min(p, q) + (1 - \beta)\, r'$, and its error at $x$ is
$$\Pr[X = x] - p(x) \;=\; (1 - \beta)\big(r'(x) - r(x)\big).$$
So the output is exact if and only if $r' = r$.

*Proof.* Theorem 1's decomposition $\Pr[X = x] = \min(p(x), q(x)) + (1 - \beta)\, r(x)$ holds with $r'$ in place of $r$, since it used only that the replacement is drawn independently from the given distribution; subtracting $p(x) = \min(p(x), q(x)) + (1 - \beta)\, r(x)$ gives the error. ∎

The natural mistake is $r' = p$. In the example it outputs a with probability $0.30 + 0.25 \times 0.50 = 0.425$ instead of $0.50$ and b with probability $0.30 + 0.25 \times 0.30 = 0.375$ instead of $0.30$. In general the output is then
$$\min(p, q) + (1 - \beta)\, p \;=\; \min(p, q) + (1 - \beta) \min(p, q) + (1 - \beta)\, (p - q)^+ :$$
the overlap is delivered once by acceptance and then a further $1 - \beta$ of it again inside $p$, while the owed mass $(p - q)^+$, which lives exactly where the target outweighs the draft, is scaled down to $1 - \beta$ of itself. Every token with $q(x) \ge p(x)$ gains, by $(1 - \beta)\, p(x)$. A token the target overrates moves by $(1 - \beta)\, p(x) - (p(x) - q(x))$, a loss exactly when $q(x) / p(x) < \beta$. The changes sum to zero, so the losses, which can fall only on tokens the target overrates, pay for all the gains.

**Proposition 2 (greedy decoding).** If $p$ is a point mass at $x^*$ (temperature zero), then at that position the procedure outputs $x^*$ with probability one; it accepts the guess exactly when $x = x^*$, so $\beta = q(x^*)$.

*Proof.* $\min(1, p(x)/q(x))$ is $0$ for $x \ne x^*$ and $1$ for $x = x^*$, so the guess is accepted if and only if it is $x^*$, and $\beta = \sum_x \min(p, q) = q(x^*)$. If $q(x^*) < 1$ the residual is $(p - q)^+ / (1 - \beta)$, which is $(1 - q(x^*)) / (1 - q(x^*)) = 1$ at $x^*$ and $0$ elsewhere, so a rejection also outputs $x^*$; if $q(x^*) = 1$ the guess is always $x^*$ and always accepted. ∎

So with greedy decoding the method reproduces the target's greedy output token for token, and the acceptance probability at that position is the probability that the draft's sample coincides with the target's argmax.

## A whole sequence from one target pass

Now the draft runs $\gamma$ steps ahead. Write $x_{<i}$ for $(x_1, \dots, x_{i-1})$. The draft draws
$$x_1 \sim q(\cdot \mid s), \quad x_2 \sim q(\cdot \mid s, x_1), \quad \dots, \quad x_\gamma \sim q(\cdot \mid s, x_{<\gamma}),$$
and the target computes, in a single pass over the $\gamma + 1$ positions,
$$p_i(\cdot) \;=\; p(\cdot \mid s, x_{<i}) \qquad \text{for } i = 1, \dots, \gamma + 1.$$
Write $q_i(\cdot) = q(\cdot \mid s, x_{<i})$, let $\beta_i$ and $r_i$ be the quantities of the previous section for the pair $(p_i, q_i)$, and let $u_1, \dots, u_\gamma$ be uniforms, independent of each other and of the draft's draws.

The iteration goes left to right. For $i = 1, \dots, \gamma$: if $u_i < \min(1, p_i(x_i)/q_i(x_i))$, emit $x_i$ and continue; otherwise emit a fresh draw from $r_i$, independent of everything drawn so far, and stop, discarding $x_{i+1}, \dots, x_\gamma$. If all $\gamma$ guesses were emitted, emit one more token drawn from $p_{\gamma + 1}$ and stop. Let $n$ be the number of tokens emitted, so $1 \le n \le \gamma + 1$, and let $Y_1, \dots, Y_n$ be the emitted tokens.

@figure sequence

**Theorem 2 (each position is exact given its prefix).** For every $k$ with $1 \le k \le \gamma + 1$ and every $y_1, \dots, y_k \in V$ for which the conditioning event has positive probability, that is, $p(y_i \mid s, y_{<i}) > 0$ and $q(y_i \mid s, y_{<i}) > 0$ for all $i < k$,
$$\Pr\big[Y_k = y_k \;\big|\; n \ge k,\; Y_{<k} = y_{<k}\big] \;=\; p(y_k \mid s, y_{<k}).$$
More precisely, let $G$ be any event of positive probability on which $n \ge k$ and $Y_{<k} = y_{<k}$, determined by $(x_{<k}, u_{<k})$ together with random variables independent of this iteration's draws. Then conditional on $G$, $Y_k$ has law $p(\cdot \mid s, y_{<k})$. The displayed statement is the case $G = \{n \ge k, Y_{<k} = y_{<k}\}$, whose probability $\prod_{i < k} \min(p(y_i \mid s, y_{<i}),\, q(y_i \mid s, y_{<i}))$ is positive under the stated condition.

*Proof.* First let $k \le \gamma$. On $G$ the first $k - 1$ guesses were accepted and equal $y_{<k}$, so $p_k = p(\cdot \mid s, y_{<k})$ and $q_k = q(\cdot \mid s, y_{<k})$ are fixed distributions. Write $G = \{x_{<k} = y_{<k}\} \cap G'$, where $G'$ is determined by $u_{<k}$ and by variables independent of this iteration's draws. All the draft's draws are independent of the uniforms, of those variables and of the residual draws, so conditional on $x_{<k} = y_{<k}$ the guess $x_k$ has law $q_k$, by construction of the draft, and is independent of $G'$; conditioning further on $G'$ therefore leaves the joint law of $(x_k, u_k)$ and the residual draw unchanged. The $k$-th emitted token is therefore produced from $(x_k, u_k)$ and, on rejection, a fresh draw from $r_k$, by exactly the one-position procedure for the pair $(p_k, q_k)$, and Theorem 1 gives the claim.

For $k = \gamma + 1$, on $G$ all $\gamma$ guesses were accepted and equal $y_{\le \gamma}$, and $Y_{\gamma + 1}$ is by construction a fresh draw from $p_{\gamma + 1} = p(\cdot \mid s, y_{\le \gamma})$, independent of $G$. ∎

Theorem 2 does not say that the joint law of $(Y_1, \dots, Y_n)$ within one iteration is the target's. Conditioning on $n \ge k$ selects runs whose first $k - 1$ guesses were accepted, and for instance $\Pr[Y_1 = y \mid n \ge 2] = \min(p_1(y), q_1(y)) / \beta_1$, not $p_1(y)$: the stopping rule biases the prefix toward the overlap. What is exact is each token given its prefix, and that is all the next result needs, because the generation does not stop at a rejection: the next iteration continues from the prefix emitted so far, residual token included.

**Corollary 1 (the whole generation is exact).** Run iterations back to back, each starting from the prefix emitted so far, and write $Z_1, Z_2, \dots$ for the tokens of the whole run. Then for every $m$ and every $y_1, \dots, y_m$,
$$\Pr[Z_1 = y_1, \dots, Z_m = y_m] \;=\; \prod_{k = 1}^{m} p(y_k \mid s, y_{<k}),$$
which is the probability the target alone assigns to $y_1 \dots y_m$.

*Proof.* Number the iterations $1, 2, \dots$. Each uses fresh randomness, independent of everything before it; its draws are functions of that randomness and of its starting prefix, which the completed iterations determine. So conditional on its starting prefix being $\pi$, an event determined by the completed iterations, iteration $t$ is the one-iteration procedure run from $\pi$, with draws independent of the completed iterations.

By induction on $m$; for $m = 0$ both sides are $1$. Let $m \ge 1$ and suppose the claim holds for $m - 1$. The run determines the iteration $t$ in which $Z_m$ is produced and its position $j$ there: $j = 1$ means $Z_m$ is the first token of a fresh iteration, $j \ge 2$ the $j$-th token of one whose first $j - 1$ guesses were accepted. Let
$$G_{t,j} \;=\; \{Z_{<m} = y_{<m},\; Z_m \text{ is the } j\text{-th token of iteration } t\}.$$
These events partition $\{Z_{<m} = y_{<m}\}$, and each is determined by the completed iterations $1, \dots, t - 1$ together with $(x_{<j}, u_{<j})$ of iteration $t$, never by its unexamined guesses. Fix one of positive probability. It lies inside the event that iteration $t$ starts from the prefix $s, y_{<m-j+1}$, so $\Pr[\,\cdot \mid G_{t,j}]$ may be computed conditional on that prefix, where Theorem 2 applies to iteration $t$ with the completed iterations as the independent variables. If $j = 1$, Theorem 2 at position $1$ gives $\Pr[Z_m = y_m \mid G_{t,1}] = p(y_m \mid s, y_{<m})$. If $j \ge 2$, the first $j - 1$ guesses of iteration $t$ were accepted and equal $y_{m-j+1}, \dots, y_{m-1}$, and the strengthened form of Theorem 2 at position $j$ gives the same value. Summing $\Pr[Z_m = y_m,\, G_{t,j}] = p(y_m \mid s, y_{<m}) \Pr[G_{t,j}]$ over all $(t, j)$, the events of probability zero contributing nothing, gives
$$\Pr[Z_{\le m} = y_{\le m}] \;=\; p(y_m \mid s, y_{<m}) \, \Pr[Z_{<m} = y_{<m}],$$
and the induction hypothesis finishes the step. ∎

The discarded guesses matter here. A guess $x_{i+1}$ drafted after a rejected $x_i$ was drawn from $q(\cdot \mid s, x_{\le i})$, conditioned on a token that was not emitted; keeping it would condition the output on a prefix that does not exist.

## Why the acceptance rate cannot be higher

**Proposition 3 (the acceptance probability is maximal).** Let $(X, Y)$ be any pair of random variables with $X \sim q$ and $Y \sim p$, jointly distributed in any way. Then
$$\Pr[X = Y] \;\le\; \sum_{x \in V} \min\big(p(x), q(x)\big) \;=\; \beta,$$
and the procedure of this reading attains equality: its output equals the draft's guess with probability exactly $\beta$.

*Proof.* $\Pr[X = Y] = \sum_x \Pr[X = x, Y = x]$, and each term is at most both $\Pr[X = x] = q(x)$ and $\Pr[Y = x] = p(x)$, hence at most $\min(p(x), q(x))$. For the equality, take $X$ to be the draft's guess and $Y$ the procedure's output; $Y \sim p$ by Theorem 1. $Y = X$ on acceptance, which has probability $\beta$ by Lemma 2, so $\Pr[Y = X] \ge \beta$, and the inequality just proved gives $\Pr[Y = X] \le \beta$. (In fact $Y = X$ only on acceptance: a rejected $x$ has $q(x) > p(x)$, so $r(x) = 0$ and the redraw never returns it.) ∎

Read this as a limit on every exact scheme. Any method whose guess is drawn from $q$ and that keeps it more often than $\beta$ outputs a $Y$ with $\Pr[Y = X] > \beta$, so by Proposition 3 the law of $Y$ is not $p$. The quantity $1 - \beta$ is the total variation distance between $p$ and $q$: Lemma 2 applied with the roles of $p$ and $q$ swapped gives $\sum_x (q(x) - p(x))^+ = 1 - \beta$ as well, and $|p - q| = (p - q)^+ + (q - p)^+$, so $\sum_x |p(x) - q(x)| = 2(1 - \beta)$. The acceptance probability of an exact scheme is therefore at most one minus the distance between the two models at that position.

## How many tokens one iteration yields

**Proposition 4 (expected tokens per iteration).** Suppose the acceptance events at the $\gamma$ positions of an iteration are independent, each with probability $\alpha$. Then
$$\mathbb{E}[n] \;=\; \sum_{k = 0}^{\gamma} \alpha^k \;=\; \frac{1 - \alpha^{\gamma + 1}}{1 - \alpha} \qquad (\alpha < 1),$$
and $\mathbb{E}[n] = \gamma + 1$ when $\alpha = 1$.

*Proof.* The iteration emits one token no matter what, plus one further token for each $k = 1, \dots, \gamma$ such that the first $k$ guesses are all accepted: if the first $k$ guesses are accepted then at least $k + 1$ tokens are emitted, the $k$ guesses and either the residual draw at position $k + 1$ or the bonus token. So $n = 1 + \sum_{k = 1}^{\gamma} \mathbf{1}[\text{first } k \text{ accepted}]$, and by independence $\mathbb{E}[n] = 1 + \sum_{k = 1}^{\gamma} \alpha^k$, a geometric sum. ∎

The independence is a modelling assumption, since in truth $\beta_i$ depends on the prefix; the paper uses it to estimate the speedup, which is $\mathbb{E}[n]$ divided by the cost of an iteration in units of one target pass. The exactness results above do not depend on it.

## What the theorems do not say

- **Numerics.** Theorem 2 assumes the $p_i$ from the batched pass equal the $p_i$ the target would compute one position at a time. In floating point they differ in the last bits because kernels take different paths at different shapes: verifying $\gamma + 1$ positions in one pass is a different matrix shape from one position at a time. This is the same discrepancy as changing the batch size on an ordinary server, not a property of the method.
- **Relaxed acceptance.** Methods that keep a guess whenever the target finds it typical enough, or whenever it lies in the target's top $k$, change step 2. By Proposition 3 any rule that accepts more often than $\beta$ changes the output law; such methods trade exactness for speed knowingly.
- **Implementation.** Drawing the replacement from $p$ instead of $r$ (Proposition 1) or keeping guesses after a rejection (the remark after Corollary 1) each break the identity in a computable way.

## Where this sits

A pair $(X, Y)$ with $X \sim q$ and $Y \sim p$ is called a coupling of $q$ and $p$, and one attaining $\Pr[X = Y] = \sum_x \min(p, q)$ is a maximal coupling. Theorem 1 and Proposition 3 together say the accept-or-resample rule is a maximal coupling of the draft with the target, built one token at a time.

The construction is not classical rejection sampling, though it looks like it. Rejection sampling accepts $x \sim q$ with probability $p(x) / (C q(x))$ for the envelope constant $C = \max_{x:\, p(x) > 0} p(x) / q(x)$, with $p(x) / 0 = \infty$, and retries on rejection. With that acceptance rule, falling back to a draw from $p$ is exact, but the acceptance probability is $\sum_{x:\, q(x) > 0} q(x) \cdot p(x) / (C q(x)) = 1 / C = \min_{x:\, p(x) > 0} q(x) / p(x)$, both sides being $0$ when $C = \infty$. This is at most $\beta$, since $C \ge 1$ and $p(x) / C \le q(x)$ give $p(x) / C \le \min(p(x), q(x))$ for every $x$, and it is zero as soon as the draft gives probability zero to any token the target allows (the paper's Appendix A.2 makes the first point). Speculative sampling instead accepts with probability $\min(1, p(x) / q(x))$, needs no $C$, never retries, and reaches the maximal $\beta$ precisely because the residual $r$ absorbs what the larger acceptance would otherwise double-count (Proposition 1).
