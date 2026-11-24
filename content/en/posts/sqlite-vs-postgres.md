---
title: "I Replaced Postgres With SQLite and Regretted It in Three Places"
date: 2026-11-10
draft: false
translationKey: "sqlite-vs-postgres"
slug: "sqlite-vs-postgres"
summary: "Cutting a managed Postgres instance for a single SQLite file saved money and a whole category of operational worry. It also broke in three predictable ways, all of which I could have foreseen with a ten-minute checklist."
tags: ["database", "sqlite", "postgres", "architecture"]
categories: ["Engineering"]
keywords: ["sqlite vs postgres", "sqlite concurrent writes", "sqlite busy timeout", "when not to use sqlite"]
ShowToc: true
TocOpen: true
---

Postgres was costing me a monthly bill and, more expensively, a category of attention: backups, connection limits, version upgrades, a dashboard I felt obliged to check. SQLite promised one file and zero servers. For a project with a few thousand rows and one writer, it delivered exactly that.

Then the project grew, and I met the three edges of the trade.

## The premise: I wanted one file, not one server

- The workload: a small internal tool, ~40k rows, single deploy target.
- What SQLite genuinely wins: backup is `cp`, latency is microseconds, local development is identical to production.
- The question I should have asked first: how many **concurrent writers** will this ever have?

## Regret 1: concurrent writes turn into `SQLITE_BUSY`

- Symptom: sporadic `database is locked` under a background job plus user traffic.
- Why WAL mode helps but does not remove the single-writer constraint.
- The `busy_timeout` and retry-with-backoff pattern that made it tolerable.
- The honest conclusion: if you need real write concurrency, you need a different database, not a better pragma.

## Regret 2: migrations without a real migration tool

- What I missed from the Postgres ecosystem: transactional DDL, `ALTER TABLE` that does not require table rewrites.
- SQLite's 12-step table-alter dance, and why a half-applied migration is far more dangerous here.
- What I now do instead: version the schema in code, run migrations inside an explicit transaction, and refuse to start on a schema mismatch.

## Regret 3: analytics queries that need window functions and parallel scans

- The report that started at 200 ms and ended at 11 seconds.
- What SQLite does well (single-table scans, small indexes) versus what it was never built for (multi-way joins over millions of rows).
- The escape hatch: replicate to a read-only analytics store rather than fight it.

## Where SQLite was actually right

- Single-tenant deployments and edge/embedded use.
- Test suites: an in-memory database per test is unbeatable.
- Read-heavy workloads with a single background writer.

## The rule I use now

> SQLite if there is exactly one process that writes and you can name it. Anything else, start with Postgres.

- One sentence per row of the decision table: writers, data size, backup story, upgrade story.
- The cost of being wrong in each direction, in hours.
