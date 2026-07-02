# Problems Revealed by the Test Project

The test project (see the main README) has led to a great many lessons and concerns.

Although the project works in practice, it is slow, rigid, and increasingly difficult to evolve.

## UI Unwieldiness

This is probably the worst issue of them all.

Deliberately, I kept the test project simple by implementing it using Django templates, HTMX, and Alpine.js. Editing notes, LLM responses, and various forms of articles and documents all take place in Markdown using a minimal editor interface.

The reality, however, is that every week demands more sophisticated interaction.

I need components.

In OmniGraph (the sister project), I revisited Vue.js and found it to be a much more reasonable framework to work with than when I last used it several years ago.

## Performance

The current backend uses Django, PostgreSQL, and server-side generated HTML.

This architecture easily falls into the trap of excessive requests and increasingly expensive template generation.

The first question is therefore whether Django, Django REST Framework, and PostgreSQL can provide sufficient performance as an API backend for a modern frontend application.

If so, Python may remain the backend language of choice.

Otherwise, Rust becomes an obvious candidate.

## Flexibility

Because of the limited sophistication of the original UI architecture, I quickly ended up with hard-coded entity types, hard-coded tools, and hard-coded view functions.

Every week, these assumptions are challenged by new use cases, while the complexity of the templates grows almost geometrically.

The system must make it easy to introduce entirely new axes of interest without requiring architectural changes.

Examples include:

* Book language.
* Entity types and observables relevant to a particular field of study.
* Historical persons, places, events, and periods for history books.
* Concepts and terminology for philosophy.
* Latin terms and grammatical constructions for classical studies.

The architecture must therefore favour experimentation and extension rather than optimisation for a fixed set of assumptions.

## Moving Forward

The first iterations of the public project must establish an architectural direction that addresses at least some of these concerns.

The test project has already demonstrated that the underlying ideas work.

The challenge now is to build a system that remains maintainable as those ideas continue to evolve.
