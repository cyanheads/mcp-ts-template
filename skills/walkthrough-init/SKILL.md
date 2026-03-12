---
name: walkthrough-init
description: >
  Trace the agent onboarding flow after `init` scaffolds a new project. Starts from the agent reading CLAUDE.md for the first time and follows every instruction chain through skills and framework docs. Use to audit the onboarding path, find dead ends, or catch missing instructions.
metadata:
  author: cyanheads
  version: "1.0"
  audience: internal
  type: debug
---

## What this skill does

A developer has run `npx @cyanheads/mcp-ts-core init banking-mcp-server` and `bun install`. They open the project and run `claude`. You are that agent, seeing this project for the first time.

Trace the onboarding path through the actual files as they exist right now. Follow every instruction chain — read what you're told to read, do what you're told to do, and report what happens.

---

## Instructions

### Step 1: Read the project's CLAUDE.md

This is the first file the agent sees. Read `templates/CLAUDE.md` (or wherever the template lives). Report:

- What does it tell you to do first?
- What files does it point you to?
- Does it mention the `setup` skill? How?

### Step 2: Follow the first instruction

Whatever CLAUDE.md says to do first — do it. If it says to read a file, read it. If it says to run a skill, read that skill's SKILL.md. Report what you find and what it tells you to do next.

### Step 3: Keep following the chain

Continue following instructions until you've completed the full onboarding loop. At each step:

- What file are you reading?
- What does it tell you to do?
- Can you actually do it? (Do the referenced files/paths exist?)
- What's the next step it points you to?

### Step 4: Report

After the chain ends (or breaks), produce:

1. **The path you followed** — ordered list of files read and actions taken
2. **Broken links** — instructions that point to files that don't exist, skills that aren't written, or actions that can't be completed
3. **Dead ends** — places where the instructions stop and you don't know what to do next
4. **The complete onboarding flow** — a summary of what a new agent actually experiences, step by step
