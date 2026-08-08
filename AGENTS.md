# AGENTS.md

This file provides guidance to AI agents (Junie, Claude, etc.) when working with code in this repository.

## Project Status

**Status (August 2026): Active Frontend Development.**

The project has transitioned from the planning phase into active development of the frontend. We are building the public version of The Palimpsest Engine by migrating and refining features from a prior experimental test project.

## Architectural Decision: The "Backend Lock"

To accelerate the implementation of necessary frontend features, the project has adopted a specific architectural constraint:

1.  **Frontend:** Focused development using **Vue.js** (located in `Apps/Palimpsest-Web`).
2.  **Backend:** The project is "locked" to the **existing experimental backend** (Django/PostgreSQL).
3.  **Code Access:** The backend code is **not** included in this repository; it resides in a separate, private project. Agents should focus exclusively on the Vue.js frontend and assume the backend API is a given.
4.  **Goal:** The primary objective is to implement frontend features that were identified as necessary during the planning and test project phases.

## Guidance for Agents

-   **Consult Planning Documents:** Before proposing or implementing features, read the documents in `Documentation/Planning/`. These reflect deliberate architectural choices and lessons learned from the test project.
-   **Frontend Focus:** All coding tasks should be directed at the Vue.js application. Do not attempt to modify or locate backend logic within this repository.
-   **API Integration:** Develop against the existing Django REST Framework API. Since you cannot access the backend code, rely on existing frontend patterns or request clarification regarding API endpoints and data structures.
-   **Maintain Flexibility:** The system favors experimentation and extension. Ensure that entity types, tools, and "observables" are configurable and not hard-coded.
-   **OmniGraph Split:** Maintain the intentional split between OmniGraph (structure reconstruction) and Palimpsest (study experience).

## Key Constraints to Carry Forward

-   **Experimentation over Optimization:** Prioritize a platform that allows for rapid iteration of tools, prompts, and workflows.
-   **Domain Agnostic:** The architecture must make it easy to introduce new axes of study (languages, historical entities, philosophical concepts, etc.) without structural changes.
-   **Component Sophistication:** Use Vue.js to support the sophisticated interaction required for deep study, which server-rendered templates could not provide.
