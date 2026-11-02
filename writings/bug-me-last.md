---
title: "Bug me last"
date: 2026-07-04
summary: "Memory, then an API, then search, then the browser, then me. Every rung costs more than the one below it, and I am the most expensive."
tags: [agents, software, design]
pinned: false
announce: false
---

Every time an agent asks me a question it could have answered itself, it tells me something about how it was built. The question is rarely hard. Which directory is the config in. JSON or YAML. Should I proceed. What it reveals is a lookup order, and the lookup order is wrong.

Here is the order I want. Memory first: what has already been established in this project, this session, this repo. Then APIs: the structured, typed, authenticated endpoints that return an exact answer in milliseconds. Then search: the open web, unstructured and noisy but wide. Then the browser: slow, visual, a last resort for pages that refuse to be anything but pages. Then, and only then, me.

The order is a cost gradient. Memory costs nothing. An API call costs a round trip and returns a fact with a schema attached. A search costs a round trip and returns ten guesses. A browser session costs seconds per click and returns pixels. A human costs minutes of latency at best, hours when I am asleep, and returns an answer that is itself a guess, because I usually know less about the current state of the task than the agent does. I am the most expensive oracle in the stack and the least reliable one. Treat me accordingly.

The industry has this backwards because of a confusion about what politeness is. Products that interrupt constantly are described as keeping the human in the loop, which sounds like respect and functions as delegation of blame. If the agent asks before every step, nothing it does is its fault. That is not safety. That is a design that has outsourced its judgment to the person least able to exercise it, at the moment they are least able to exercise it, and called the result alignment.

The honest version of the loop is narrower. Ask me when the action cannot be undone and the choice is a real fork: delete this, send that, spend money, publish. Ask me when the task as stated contradicts itself and no amount of reading will resolve the contradiction. Otherwise climb the ladder. Check what you already know. Hit the endpoint. Search. Open the page if you must. Take the most reasonable reading, write it at the top of your work so I can see which reading you took, and keep going.

I have been building a command framework in Rust where this principle is enforced by the compiler rather than by a prompt. The system definition is generated from the plugin's own types at build time, so a bound that will not typecheck is a compile error and not a surprise at registration. The point of that design is the point of the ladder: push every question as far upstream as it can go. Resolve it in memory if memory has it. Resolve it in the type system if the type system can. Resolve it in a schema. The human is where unresolvable things go, and the measure of a system is how few things it leaves unresolvable.

An agent that bugs me last has not stopped being careful. It has spent its carefulness on the rungs where carefulness is cheap, so that when it finally reaches me it is carrying a decision and not a question.
