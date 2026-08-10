---
title: Two-Player Catan Research Engine & AI
org: Bachelor Thesis
category: project
startDate: 2026-01-01
endDate: 2026-06-30
summary: A co-authored C++20 research engine for a two-player, 15-VP Catan variant, with 13 native agents and reproducible benchmarks.
tech: ['C++20', 'CMake', 'GoogleTest', 'Game AI', 'Benchmarking']
links:
  - label: Repository
    url: https://github.com/FerrisOfficial/CatanAPI
  - label: Thesis
    url: https://github.com/FerrisOfficial/CatanAPI/blob/main/Thesis.pdf
featured: true
grade:
  value: 5
---

Co-authored BSc thesis with **Yaryna Rachkevych**: a high-performance C++20 engine
for a deliberate two-player Catan research variant. Games target 15 victory points
and exclude player-to-player trading so agent comparisons remain reproducible.

- Bit-packed the fixed board state into under 800 bytes and used apply/undo transitions
  so heuristic agents can evaluate candidates without copying the board
- Implemented deterministic seeding, JSONL replay inspection and multi-agent benchmarking
- Benchmarked **13 native agents** spanning random, iterative and specialised heuristics,
  chance-aware alpha-beta and evolutionarily tuned parameters
- Profiled the engine and cut per-game cost by **59%**; representative Clang 22
  `-O3` throughput is 250–300 games/s for random vs random and about 145 games/s
  for Iterative 5 mirror matches
- Verified the rules and engine with 111 test definitions expanding to 242 cases
  across six binaries, plus GCC, MSVC, Clang and AddressSanitizer CI

Even in the reduced two-player variant, dice and hidden development cards make the
state stochastic and partially observable. Agent quality therefore has to be measured
through repeated seeded play rather than inferred from search depth alone. The platform
compares deterministic heuristics, chance-aware alpha-beta and evolutionarily tuned
evaluation policies under the same reproducible conditions.

The browser demo exposes 11 of the 13 agents and runs the same engine through
WebAssembly. Native and browser throughput are reported separately because compiler,
hardware and matchup materially affect games per second.
