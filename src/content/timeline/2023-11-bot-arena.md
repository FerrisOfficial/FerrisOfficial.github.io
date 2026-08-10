---
title: Bot Arena
org: Innovative Projects by Nokia
category: project
startDate: 2023-11-01
endDate: 2024-06-30
summary: A co-developed Python framework for reproducible programming-game tournaments, isolated bot execution and inspectable match replay.
tech: ['Python', 'pygame', 'Process Management', 'Timeout Handling', 'Logging', 'Replay']
links:
  - label: Repository
    url: https://github.com/FerrisOfficial/bot-arena
featured: true
dateApproximate: true
---

A Python framework for running reproducible programming-game tournaments, isolating
submitted bots and recording matches for later inspection.

- Co-developed the project and personally implemented the game logic, map generation,
  bot package and interface, timeout enforcement, logging and move-by-move replay
- Managed bot processes and enforced per-move and whole-game time limits so faulty or
  unresponsive submissions could not block a tournament
- Added reproducible match logs and replay functionality to make bot decisions and
  game outcomes inspectable
- Designed the bot interface and packaging flow used to execute competing submissions
