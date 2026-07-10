# AGENTS.md — Water Calculator

## Commands

<!-- Example: npm run dev | pytest | go run . -->
- **setup:** ``
- **build:** ``
- **lint:** ``
- **typecheck:** ``
- **test:** ``
- **run single test:** ``

## Architecture

<!-- Key entrypoints, package boundaries, generated code, etc. -->

## Conventions

- **OOP, interface-first:** every module exposes a TS interface, one class implements it. Dependencies are constructor-injected. No module reaches into another's internals.
- Features are self-contained plugins — removing any one (detector, scraper, estimator, overlay) must not break the pipeline.
- No circular imports. All shared types in `src/shared/types.ts`. All DB access through `src/shared/db.ts`.

## Gotchas

<!-- Setup requirements, env quirks, flaky tests, required command order, etc. -->
