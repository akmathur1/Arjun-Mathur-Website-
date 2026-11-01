# House style for the Writings section

Who is writing: a computational scientist (statistical physics of protein condensates, Rust systems code) who reads markets, commodities and infrastructure the way he reads a Hamiltonian: find the term that dominates, ignore the rest. He invests his own money and says so. He is combative toward corporate euphemism and bored by consensus. He is not a crank.

## Voice

- First person, singular. Present tense where the subject allows. "I think," "my bet," "I own this" are fine and preferred over the passive.
- Dense. Every sentence carries a fact, a claim, or a turn. Cut throat-clearing. Cut summaries of what was just said.
- Open on the concrete: a number, an object, a place, a transaction. Never on the thesis, never on a definition, never on "In today's".
- One turn in the middle, where the piece says the thing the sell-side deck does not say.
- Close on a line that could stand alone. Not a recap. Not a call to action. Not a rhetorical question.
- Combative toward systems and incentives, never toward named people. Translate euphemism out loud: "what the 10-K calls 'medical cost trends' is the company paying for fewer surgeries."
- Philosophy and history when they do real work: Augustine, Hobbes, Weber, Schumpeter, Polanyi, Veblen, Keynes, Girard, Heraclitus, Thucydides, Habermas. At most one per piece. Most pieces have none. A name without its idea is a name-drop; cut it.
- Metaphor from the author's own territory is allowed and distinctive: phase separation, free energy, chemical potential, compile-time versus runtime, type systems, Langevin noise, order parameters. At most one per piece, and it must map correctly. If the physics is wrong the metaphor is cut.
- Wry, not angry. Confident, not shouting. "Super cool, nothing crazy": no conspiracy, no rage, no prophecy without a date.

## Structure and length

- 350–650 words. The pinned piece runs about 1,100.
- Paragraphs of two to five sentences. The site renders in monospace; long paragraphs become walls.
- No headers under 500 words. At most two short headers otherwise.
- No bullet lists in the body. No bold for emphasis. Italics rarely, for a term being introduced or a title.
- Tickers once, in parentheses, on first mention of a company the reader could buy: "Otis (OTIS)". Then just the name.
- End with a short "Sources" block: two to five links, primary where possible (regulator orders, IEA, USGS, SEC filings, company investor pages). Plain markdown links, one per line. A piece that makes no factual claims beyond common knowledge (the agents piece, the open-box piece) may carry one link or none.

## Facts

- Every number is verified by a web search dated 2025–2026 before it goes in. Prefer one sharp number to five soft ones. Round sensibly: "about $4.3 billion," not "$4.31 billion."
- Where the author's raw note is wrong, the piece says the true thing and keeps the author's spirit. We do not publish a false fact because it sounds better. Each correction is logged in EDITOR-NOTES.md so the author can see what moved.
- Investment opinions are the author's and are phrased as such. No invented performance claims. No tax or legal claim that is not true.
- Political violence is condemned plainly and without hedging. Anger at institutions is explained, not endorsed as a method.

## Banned

Words and phrases: genuinely, honestly, straightforward, delve, tapestry, landscape (as in "the landscape"), leverage as a verb, unlock, game-changer, paradigm, synergy, robust, ecosystem unless literal, navigate, journey, "in today's", "at the end of the day", "it's important to note", "needless to say", "that being said", "let's dive in", "buckle up", "here's the thing", "let that sink in", "the reality is", "make no mistake".

Constructions: "It's not X, it's Y" at most once per piece. "This isn't just about" never. Three rhetorical questions in a row never. Tricolon closers ("X, Y, and Z.") watched. Em-dashes rationed to two per piece; prefer the period, the colon, the semicolon.

## Front matter

```
---
title: "Title in sentence case"
date: 2026-10-29
summary: "Two lines on the site. About 100 to 140 characters. Says what the piece claims, not what it is about."
tags: [commodities, chokepoints]
pinned: false
---
```

Summaries are claims, not topics. "Why Jane Street got banned from the world's busiest options market, and why more funds should follow it there" rather than "Thoughts on Indian derivatives."

Filenames are kebab-case slugs of the subject, not the title: `open-box.md`, `jane-street-india.md`.
