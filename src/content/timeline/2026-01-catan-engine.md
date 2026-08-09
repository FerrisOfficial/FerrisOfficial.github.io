---
title: Catan Game Engine & AI Simulation Platform
org: Bachelor Thesis
category: project
startDate: 2026-01-01
endDate: 2026-06-30
summary: A high-performance C++ game engine with a custom AI framework, benchmarking 11 autonomous agents.
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

Bachelor thesis: a high-performance game engine written in C++ with a custom AI
framework for autonomous agents.

- Built the engine and a complete rules implementation of Catan from scratch in C++20
- Designed a custom AI framework that lets agents be swapped in against a common interface
- Designed and benchmarked **11 AI agents** across a range of strategic behaviours, from a random baseline to alpha-beta search

Catan is a deceptively good testbed for game AI. It has hidden information, randomness
from dice, and negotiation between players — which rules out the search techniques
that solve chess outright. Agents have to reason under uncertainty instead.

The fixed-seed benchmark suite runs **1,530 games across six matchups**, reporting
throughput and win rate for each one. That repeatability makes engine performance
and agent behaviour directly comparable between changes.
