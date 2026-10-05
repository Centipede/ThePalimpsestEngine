# Search

WIP: Last updated 2026.10.05

Searching is ubiquitous.
- Users must be able to search across entire collections
- Users doing expensive searches must be able to limit their search to specific chapters.
- Tools must be able to search for specific chapters to focus their effort before further processing can continue.
- Users may also want to search on behalf of the AI.
- Results themselves are also a topic for further processing. Examples:
  - Include the entire chapter's text
  - Include the entire chapter's text and a summary of each subchapter and subchapter's subchapters etc.
  - Use the chapter's title, summary, perhaps entities. Include titles only for subchapters down to one level.
  - Find all questions/answers and entities across a category of books, but go no further.

The combinations are endless but relevant if the search result is intended to be used as input in a chat session.


## Scope, filtering/selection, and materialisation

Search in Palimpsest is not necessarily a single operation. A search may be built as a sequence of increasingly narrow operations, where the result of one operation becomes the starting point for the next.

A **Scope** is data: a representation of a set of objects available for further processing. Scopes may represent objects at successively finer levels of granularity, from authors and books, through chapters and sections, down to individual information blocks. A scope may also contain other kinds of information, such as questions and answers, conversations, entities, or future information types.

**Filtering/selection** is the process of limiting a scope. This may be done explicitly by the user, or collaboratively by the user and an agent. In the latter case, the agent may perform searches, suggest material, follow relationships, or otherwise help determine what should remain in the scope, while the user may guide, refine, accept, or reject its choices.

The distinction from materialisation is therefore not primarily about automation. Filtering/selection expresses the intention to limit the current scope; materialisation is the operation that resolves that intention into a narrower scope. Whether the intention is formulated entirely by the user or with the assistance of an agent does not fundamentally change this distinction.


**Materialisation** is a system operation that converts a scope into a narrower scope. It may be entirely mechanical, such as expanding selected chapters into their content blocks, or it may involve intelligent processing, such as identifying chapters relevant to a question. Materialisation does not itself represent a user decision; it resolves the current scope into more concrete material.

These operations can be repeated arbitrarily. A materialised scope can become the current scope for another round of filtering/selection, followed by another materialisation. Consequently, searching in Palimpsest is better understood as a chain of operations than as a single search query.


 
## Use Case Analysis

- I want to ask a question: _"I’m trying to understand what changed during the Cretaceous–Paleogene extinction event, and what the geology tells us about what happened during that period."_
  - If this takes place in an environment that already has a `context`, then that context will be applied to the filters mentioned below.
- I write the question and hit "Add corpus text ..." to control the knowledge base. Alternatively a button saying "Let AI find relevant texts".
- I'm presented with a large dialog box with a `topics` filter, an `author` filter, a `book` filter. These may be prefilled from the context. I can break out of that preselection if I want to (and re-apply it with a button).
- Let's say that I have a set of books on geology. Looking at the books, I note the following:
  - There are five books that I know fairly well. Few enough that an intelligent chapter search is feasible.
  - Metadata tells me that all books have been thoroughly analyzed by the system already.
  - All 5 contain chapter summaries (brief and long).
  - 3 contains the following entities: places, times, theories
  - 2 contains also these entities: evolutionary stages, dinosaurs.
  - Some of them have super-chapter summaries, i.e. they have a kind of summary that spans multiple chapters and them suitable for drill-down.
- Based on that, I write: "I need to find chapters that can "



## Test Project Experiments

While the test project (See README.md) experimented with many kinds of search, the truth is that not all were useful.
- Database powered search:
  - Postgresql FTS (Full Text Search) is the best, though it held a few surprises (ordinary words silently excluded, deals poorly with OCR errors)
  - Vector search based on mp2net yielded lousy results. Probably I did something wrong. Probably it is worth investigating again using a cloud provider's vectors instead.
- Full text traversal. The fact is that all actual search tools remained in the toolbox. I used them a couple of times, but it was not worth the effort. The corpus is too vast for 
  - Textdistance (python library for fuzzy search).
  - Spacy (python library for natural language processing). For seach, it's embeddings are too rough, I suppose. It is used for other NLP problems as well, but not for search.
  - 
