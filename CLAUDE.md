# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**This project is in the planning phase (as of June 2026). No implementation exists yet.**

Planning documents live in [Documentation/Planning/](air-file://78jsn19l8lubtjdga3as/Volumes/APPWORK/FOSS/ThePalimpsestEngine/Documentation/Planning?type=file&root=%252F). Read these before proposing any implementation — architectural decisions are deliberate and informed by lessons from a prior working test project.

## What This Is

The Palimpsest Engine is a personal study platform designed to help readers study books deeply: remembering across sessions, building understanding across multiple books, rediscovering prior passages rather than generating new ones, and supporting note-writing and self-examination. It is a sister project to [The OmniGraph Engine](https://github.com/Centipede/TheOmnigraphEngine), which handles OCR and reconstruction of scanned book structure.

## Planned Architecture

The test project (private, Django + HTMX + Alpine.js + PostgreSQL, server-rendered) has proven the core ideas work but exposed three problems that constrain the public rewrite:

1. **UI unwieldiness** — Server-rendered templates cannot support the component sophistication now required. The rewrite targets **Vue.js** on the frontend (already validated in OmniGraph).

2. **Performance** — Server-side template generation at scale is expensive. The backend will be **Django REST Framework + PostgreSQL** if that proves adequate as a pure API layer; otherwise the backend may move to **Rust**.

3. **Rigidity** — The original codebase has hard-coded entity types and tools. The new architecture must make it easy to introduce new axes of study (languages, historical entities, philosophical concepts, Latin grammar, etc.) without structural changes.

## Key Constraints to Carry Forward

- The system must favour **experimentation and extension** over optimisation for a fixed use case.
- Entity types and domain-specific "observables" must be configurable, not hard-coded.
- The split between OmniGraph (book structure reconstruction) and Palimpsest (study experience) is intentional and should be maintained.
