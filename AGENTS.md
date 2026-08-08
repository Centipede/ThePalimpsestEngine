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

## PR procedure

- Each week (Monday-Friday) the planners and testers branch off from 'main' into a planning branch. This is the "planning branch". Some coding will also take place, but mostly research and adjustments. Unit testing as well. Comments are added to a planning github issue that goes with the branch.
- Each weekend (Saturday-Sunday) is where the actual development happens. First order of business is to wrap up the planning branch.
- When the weekend finishes, the result is squash merged into the main branch.
- Copy PR description into the squash commit.
- The PR message must look like:

```
[Briefly, what is accomplished with this PR? Example:]
Adding a deeper exploration level below each entity in the categorised entity lists.

Summary

[List of items that has taken place during the branch. Example:]
* Adds a collapsible box below the entity (collapsed on reload, non-persistent)
* Requests from the backend a json body for the expanded entit
* Displays the key information from the server. If the user further expands sub elements, displays them too. 

Test plan

[Lists of instructions for a human tester. Must contain the markdown-friendly [ ] checkbox container. Example:]
* [ ] Open a section in a book containing entities. The list should be brief and condensed
* [ ] Click on a name, a box should open up below the name which shows mentions
* [ ] Click on a mention, it should expand with a quote and a link to the paragraph containing it
```

Unlike other projects, we run development and testing staggered. The developers simply merge in the PR and copies the description into the squash commit. 
The testers will later come back to the PR (now closed) and perform all the instructions in the test plan. If any fails, they will give feedback in the planning github issue.