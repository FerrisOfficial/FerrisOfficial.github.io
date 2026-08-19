---
title: SpaceX Launch Data & Recommendation API
category: project
startDate: 2025-12-01
summary: A small .NET 10 integration API with idempotent SpaceX imports, EF Core/SQLite persistence, bounded parameters and automated tests.
tech: ['C#', '.NET 10', 'ASP.NET Core Minimal API', 'EF Core', 'SQLite', 'xUnit']
links:
  - label: Repository
    url: https://github.com/FerrisOfficial/dotnet-public-api-weaver
featured: false
---

A small .NET 10 Minimal API that imports upcoming SpaceX launches and persists
them through EF Core and SQLite.

- Implemented an idempotent import: existing `ExternalId` records are updated and
  new launches are inserted instead of duplicated
- Clamped import and recommendation query parameters to documented bounds, with
  cancellation propagated through HTTP and EF Core operations
- Configured a 20-second upstream timeout and exposed aggregation and recommendation
  data through JSON endpoints
- Covered the service with **nine unit tests** and one hosted end-to-end test using
  a test SQLite database

The bounded 0-100 `WatchScore` uses implemented inputs only: webcast availability,
time until launch, mission-name categories (`Crew`, `Transporter`, `Starlink`) and
missing launchpad/date penalties. This is an API integration and persistence project,
not a full recommendation platform or visual dashboard.
