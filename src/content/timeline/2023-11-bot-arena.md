---
title: Bot Arena
org: Innovative Projects by Nokia
category: project
startDate: 2023-11-01
endDate: 2024-06-30
summary: A team-built arena for pitting user-written bots against each other and measuring how they perform.
tech: ['Python', 'pygame', 'Simulation', 'Team Project']
links:
  - label: Source on GitHub
    url: https://github.com/BartoszKruszewski/bot-arena
featured: false
dateApproximate: true
---

A group project built under **Innovative Projects by Nokia**, a university programme run
with the company. The goal was an environment where people can write their own bots,
run them against each other, and actually measure how well they perform.

- Built a simulation front end in Python and pygame, with map generation and bot selection
- Ran batches of games between two bots under configurable timeouts — per-move, per-turn and per-game
- Recorded every simulation to a log that can be replayed and inspected move by move

One of three developers on the team, and the second-largest contributor by commit count.

The idea here is the same one that later became the thesis: if you want to claim one
strategy beats another, you need a harness that can run the matchup many times and
record what happened. Bot Arena was the first version of that argument.
