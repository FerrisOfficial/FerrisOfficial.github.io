---
title: SpaceX Launch Data & Recommendation API
category: project
startDate: 2025-12-01
summary: A .NET 10 Minimal API that ingests SpaceX launch data and ranks launches by a custom WatchScore.
tech: ['C#', '.NET 10', 'Minimal API', 'SQLite', 'REST']
links:
  - label: Repository
    url: https://github.com/FerrisOfficial/dotnet-public-api-weaver
featured: false
---

A .NET 10 Minimal API that integrates SpaceX public launch data and persists it
in SQLite.

- Built the ingestion layer against the public SpaceX API, persisting launches locally
- Designed a **WatchScore** engine that ranks and prioritises launches by how worth watching they are
- Exposed the result through a REST dashboard and recommendation endpoints

The interesting design question was the scoring itself. "Worth watching" is not a
field in any dataset — it has to be composed from things that are, like payload
type, whether a booster landing is attempted, mission novelty and launch site.
WatchScore turns that judgement into something explicit and tunable.

A deliberate break from C++: the aim was to see how a modern managed stack handles
API work, and .NET 10's Minimal API is a genuinely light way to do it.
