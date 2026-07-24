# Self-study Proposals

## Administration: Organising the Library

The administration interface is responsible for managing the library itself.

* **Administrators** organise the library.
* One **Palimpsest** instance corresponds to a single library.
* Basic management of authors, books, and topics:

  * **Authors:** Create and edit names, abbreviations, full names, and short biographies.
  * **Books:** Create and edit titles, authors, and short descriptions.

    * Note that much of this metadata may eventually be promoted automatically from chapter-level summaries and other generated content.
  * **Topics:** Books can be assigned to topics, which are organised hierarchically.

---

## Students: Organising Studies

Students organise their own study projects.

* A *study project* consists of a selection of books and topics.
* The library may continue to grow long after a study has begun. This raises several design questions:

  * Should generated questions and answers update automatically when new material becomes available?
  * Or should the system instead notify the user that newly imported material may affect previous results?
  * The fundamental challenge is detecting when changes to the underlying corpus meaningfully affect existing answers.

---

## Tools and Skills

The LLM should be able to retrieve additional information using a set of progressively broader search tools, in roughly the following order:

1. Chapter search.
2. Entity (or article) search.
3. PostgreSQL full-text search (optionally combined with trigram search).
4. Vector search.

One open question is whether entity search should remain a dedicated feature, or whether it should evolve into a more general article-based search that naturally encompasses entities.

---

## Chapter Search

One of the primary advantages of this system is that books are indexed at a relatively fine granularity.

Each chapter may contain structured metadata such as:

* Hierarchical summaries (including subchapters).
* Key periods, events, locations, and people.

  * This should be configurable on a per-book basis. A history book and a neurology textbook require very different metadata.
* Paragraph segment summaries (for example: *Paragraphs 1–5: Describes the early Cold War.*)
* Keywords.

The keyword system could also support lightweight logical or fuzzy inclusion queries.

For example:

> Which chapters describe Truman's role during the 1950s?

To support this, a lightweight retrieval service could maintain condensed chapter descriptions and rapidly identify the most relevant chapters (and their surrounding subtree) before invoking a larger LLM.

---

## Dialogue

The dialogue system should be reimplemented and significantly expanded beyond the current "chat with chapters" functionality.

A key design principle is **user control**.

While autonomous AI behaviour has its place, I would prefer every retrieval step to remain visible and configurable.

### Example workflow

1. A dialogue is created.

   * The conversation initially targets the current chapter.
   * The user configures the retrieval scope:

     1. Include the current chapter and all of its subchapters.
     2. Allow PostgreSQL full-text search and vector search within the current book.
     3. Allow broader chapter searches across books belonging to selected topics (for example *Philosophy* and *Social Sciences*).

2. The retrieval system performs the necessary searches and presents a candidate context.

   * Estimated token usage and cost are displayed before the LLM is invoked.

3. The LLM generates its response.

4. The user decides to explore a different direction.

5. Before sending the next prompt, the user can control how previous context is retained.

   * Replace earlier chapters with their summaries.
   * Condense earlier conversation turns.
   * Remove irrelevant context.
   * Expand specific sections again if needed.

6. As the conversation evolves:

   * Every question and answer receives an automatically generated title or summary.
   * Conversation branches remain collapsible.
   * Context management remains explicit rather than hidden.

