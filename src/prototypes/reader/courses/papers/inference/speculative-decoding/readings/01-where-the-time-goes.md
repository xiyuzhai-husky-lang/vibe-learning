# Where decoding spends its time

A language model produces text one token at a time. Each token needs a full forward pass of the model at the newest position, with the earlier tokens available through the KV cache. The passes are strictly sequential: the next one cannot start until the token from the previous one is known, because that token is its input.

@figure autoregressive

## What one pass costs

A pass does two things. It moves the model's weights from memory into the compute units, and it does arithmetic with them. For a model with $N$ parameters stored in 16 bits, the weights are $2N$ bytes, and a pass at one position does about $2N$ floating-point operations: one multiply and one add per parameter.

Take a 7B model on one modern accelerator, with weights of 14 GB, memory bandwidth of about 3.3 TB/s and about 1000 TFLOPS of 16-bit arithmetic.

| | per decode step, batch 1 |
|---|---|
| reading the weights | 4.2 ms |
| arithmetic | 0.014 ms |

The arithmetic units are busy for less than one percent of the step. The step takes as long as streaming 14 GB through the memory bus, whatever the model computes with it. That is memory-bound decoding: the time of a step is set by bandwidth, not by the amount of computing.

@figure step-bars

The picture gets worse with context length. The KV cache of the sequence is read on every step too, so the memory term is really weights plus KV, and the KV part grows with every token generated. For short contexts the weights dominate; for very long ones the cache does. Either way the arithmetic stays negligible at batch one.

## Extra positions are almost free

Now run the same pass at $B$ positions at once. They can be the next token of $B$ different requests, or several candidate positions of one sequence; the model does not care. The weights are read once for all of them, while the arithmetic grows $B$ times.

| positions per pass | reading weights | arithmetic | step |
|---|---|---|---|
| 1 | 4.2 ms | 0.01 ms | 4.2 ms |
| 8 | 4.2 ms | 0.1 ms | 4.2 ms |
| 64 | 4.2 ms | 0.9 ms | 4.2 ms |
| 300 | 4.2 ms | 4.2 ms | 4.2 ms |
| 1000 | 4.2 ms | 14 ms | 14 ms |

Up to a few hundred positions the step does not get longer at all. Past the point where the arithmetic catches up with the memory time, the step becomes compute-bound and grows in proportion to $B$. The crossing point depends only on the accelerator's ratio of arithmetic to bandwidth, about 300 operations per byte here, not on the model.

@figure roofline

## What this leaves for one request

A server gets cheap tokens by filling that free room with other users' requests: a batch of a few hundred costs the same step as a batch of one, so each token costs a few hundred times less. A single request cannot do that. It runs at batch one, and the chip could have handled hundreds of positions in the time it spends on the one.

Speculative decoding spends that room on the same request. A cheap draft model guesses the next several tokens, and the target checks all of them in one pass, which costs about as much as a pass at one position. When the guesses are right, several tokens come out of one memory-bound step instead of one. The draft's own passes are memory-bound too, but its weights are a small fraction of the target's, so they are cheap in proportion.

Two things have to hold for this to pay. The target must be in the flat part of the curve, which is true at small batch and false on a loaded server. And the checking must not change what comes out: the next reading shows why it does not.
