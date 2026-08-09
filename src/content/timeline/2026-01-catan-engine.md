---
title: Catan Game Engine & AI Simulation Platform
org: Bachelor Thesis
category: project
startDate: 2026-01-01
endDate: 2026-06-30
summary: A high-performance C++ game engine with a custom AI framework, benchmarking 11 autonomous agents.
tech: ['C++20', 'CMake', 'GoogleTest', 'Game AI', 'Benchmarking']
links:
  - label: Source on GitHub
    url: https://github.com/FerrisOfficial/CatanAPI
  - label: Read the thesis
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

Engine throughput is what makes the research possible at all: drawing statistically
meaningful conclusions about which strategy dominates requires tens of thousands of
simulated games, so the performance work and the AI work are the same problem.
