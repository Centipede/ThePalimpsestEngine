# Entity Queries

Different books should be queried differently for entities/concepts/phenomena.

History books fits well with the usual suspects: People, events, places, times.
Sociological philosophy books will contain almost none of these but would be interesting in terms of e.g. sociological processes and named theories.

Only to some degree can we expect to be able to generally associate a specific book with a list of entity types.

This document is a central planning document for what I will call entity queries for now.

The library (see LibraryAdministration) contains a topic tree. Each topic in the topic tree can be embellished with
entity queries. Each topic in the tree will thus be associated with its own queries plus those of its ancestors.

When a book is added to the library, the administrator must enable the queries for the entities that are to be
included in the book.
The book can have additional entity queries, but those from the topic tree are readily available.

## Language

A major added complication for the old system was that it duplicated all its LLM prompts for each language supported in the system. My experience was that if the desired outcome was Danish and the book was Danish, then a few system prompts being in English could confuse the LLM (asking it to output in Danish didn't improve matters).

To be clear: The Palimpsest Engine is based on the idea that you speak the language of the books you read fairly well. You want the summaries to remain in the language and vocabulary of the book you read. This is a core assumption.


## Query management

All queries are stored in a central table. Fields:

- machine name
- human name
- Block list prompt... e.g. "Make a list of historical figures (i.e. people) mentioned and describe each with facts and one quote to support the description."


## Database:

**Per block:**
- Per entity type:
  - A list of mentions
  
A mention should consist of:
- name
- description
- quote

This is different from a section mentions whose hits also attempts to relate to the hits per block.


**Per section:**
- Per entity type:
  - A list of "unique" entities (result of grouping)
    - name (LLM synthesizes a name from the names of block references)
    - list of mentions

IFF we make each mention a database record, then the list of mentions for a given section entity consists simply of foreign keys to that table.
Otherwise, the mention should consist of something like pairs of (block-id, entity-type, index-into-ref-list)
  


## Old system:

Here is a brainstorm of snippets from the test system which must be gathered into a coherent system:
The old system was hardwired to a specific set of queries: people, times, places, works.


Per block (examples):
```text
Make a caption and a summary in few words.
Make a list of historical figures (i.e. people) mentioned and describe each with facts and one quote to support the description.
Make a list of dates or centuries (i.e. times),  mentioned and describe each with facts and one quote to support the description.
Make a list of cities or countries (i.e. places) mentioned and describe each with facts and one quote to support the description.
Make a list of written works mentioned and describe each with facts and one quote to support the description.
```

One detail is that the longer a list of entity queries that one adds, the more likely it is that the LLM fails.
Thus there must be a way to request those missing again.




Grouping:

The auto-grouper used constructed this complete list for the whole section:

```markdown
**Paragraph {number}**:
- About: {caption} - {summary}
- People:
{people}
- Times:
{times}
- Places:
{places}
- Works:
{works}
```

This is the system prompt for the auto-grouper:

```
You are a friendly assistant who speaks English.
You will be shown a list of mentions, where the task is to figure out which refers to the same {category_singular}.
You must answer with a list of items belonging to each unique {category_singular}. Answer in this format:
{format_example}

```

Where format example came from this json object:

```json
{
  "times": "1740: 3,4,6,8",
  "works": "Magna Carta: 7,12,14",
  "people": "Frederik the Great: 1,2,5,10",
  "places": "France: 11,16"
}
```


```You must try to convert the summary, caption and list of people, times, places, and works of the paragraph into the JSON format given.```


Recapping section (uses entities as input):

```markdown
You are a friendly assistant that speaks English.
Be brief. Use markdown formatting. Make lists when it makes sense. Emphasise key words (but sparingly).
You will be given an information and content of a chapter of a book, and then a question from the user.
Only answer based on the information given by the user.
```

```markdown
What is this chapter generally speaking about?
Structure the answer like in the example that follows.
Information must include:
- General theme
- Brief summary
- Which time period is central in this chapter?
- Which geographical area is central in this chapter?
- Which people are key to this chapter?
- Which institutions and organisations are key to this chapter?
- Which events are key to this chapter?
- Grouping of consecutive paragraphs into larger topics. Highlight a few topical keywords in each topic description.
```

```markdown
**Theme:** Helvétius' philosophy on human nature, ethics, society and happiness. 
**Brief summary:** The chapter discusses human nature and environment shapes ethical values, society and happiness, with a focus on enlightenment thinking, reforms and critical views on religion on autocratic power.

- **Origin of ideas** in sense impressions and experience (Paragraph 1).
- Human **emotion, passion and social traits** as shaped by environment and upbringing (Paragraphs 2-6).
- Critique of **the power of religion and intolerance** and a proposal for a rational ethics based on religion (Paragraphs 9-16)
- A **philosophy of ethics** based on human nature and self-interest, where happiness and joy are the goals of life (Paragraphs 18-24)
- A view on **politics and structure of society** including a rejection of enlightened monarchy over constitutional monarchy or democracy (Paragraph 25).
- An analysis of **economic difference, distribution of wealth and social consequences** and proposals for reforms aiming at greater happiness (Paragraphs 26-31).
```
