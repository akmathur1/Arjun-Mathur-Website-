---
title: "Bug me last"
date: 2026-07-04
summary: "The order an agent should look things up in: memory, an API, search, the browser, and then me. I'm the most expensive step and the least reliable."
tags: [agents, software, design]
pinned: false
announce: false
---

Every time an agent stops to ask me something it could have figured out on its own, I learn something about how it was built. The question is almost never hard. Which directory is the config in. JSON or YAML. Should I go ahead. What the question gives away is a lookup order, and the lookup order is wrong.

The order I actually want is this. Check memory first, meaning whatever has already been established in this project, this session, this repo. After that, the APIs: structured, typed, authenticated endpoints that give back an exact answer in milliseconds. Search comes next, wide but noisy. The browser is after that, slow and visual and only worth it for pages that refuse to be anything but pages. And then, only then, me.

I think of it as a cost gradient. Memory is free. An API call costs a round trip and gives you a fact with a schema attached. Search costs a round trip too but gives you ten guesses. A browser session costs seconds per click and gives you pixels. And a human costs minutes of latency at best, hours if I'm asleep, and what comes back is itself a guess, because by that point I usually know less about the state of the task than the agent does. I'm the most expensive oracle in the stack and the least reliable one, and I'd like to be treated that way.

The industry has this backwards, and I think it's because of a confusion about what politeness is. Products that interrupt constantly get described as keeping the human in the loop. That sounds like respect. In practice it works as a way of passing the blame along. If the agent asks before every step, nothing it does is ever its fault. I don't think that's safety. It's a design that has handed its judgment to the person least able to exercise it, at the moment they're least able to, and then called the result alignment.

There's a narrower version of the loop that I'd actually sign up for. Ask me when the action can't be undone and the choice is a real fork: deleting something, sending something, spending money, publishing. The other case is when the task as stated contradicts itself and no amount of reading will resolve it. Otherwise, climb the ladder. Check what you already know. Hit the endpoint. Search. Open the page if you really have to. Take the most reasonable reading, write down at the top of your work which reading you took so I can see it, and keep going.

I've been building a command framework in Rust where this is enforced by the compiler rather than by a prompt. The system definition gets generated from the plugin's own types at build time, so a bound that won't typecheck is a compile error instead of a surprise at registration. The idea is the same as the ladder: push every question as far upstream as it will go. If memory has the answer, resolve it there. If the type system can catch it, let the compiler do it. Failing that, put it in a schema. Whatever's left over goes to the human, and the measure of the system, as far as I'm concerned, is how little is left over.

An agent that bugs me last hasn't stopped being careful. It has spent its care on the rungs where care is cheap, so that by the time it gets to me it's carrying a decision rather than a question. That's the version I want to build, and the one I want to use.
