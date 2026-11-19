# Facet and Findings Queries

The Facet/Findings system is a generalized framework for identifying, extracting, and consolidating entities, concepts, and phenomena across the library. It supercedes the earlier, more rigid "Entity Queries" system.

## Overview

Instead of hard-coded entity types (People, Places, Times), the system uses **Facets**. A Facet is a high-level generalization of a named entity or concept (e.g., "Sociological Theory", "Historical Figure", "Geographical Area").

**Facet Queries** are the prompts and configurations used by the LLM to locate these facets within the text.

## Architectural Components

### 1. Facet Queries
Admin-created definitions that tell the system what to look for.
- **Names**: Machine names (singular/plural) must be valid Python identifiers/JSON keys.
- **Description**: A thorough English description of the concept to guide the LLM.
- **Prompts**: Language-specific prompts (`query_block_lang`, `query_section_lang`) used for extraction.
- **Schema**: Optional JSON schema (often derived from Pydantic) for structured data extraction.
- **Removal**: Facets cannot be removed once they have been put into use.

### 2. Topic Tree and Cascading
Facets are managed through a hierarchy of topics (e.g., "Sociology > Theory").
- **Assignment**: Facet queries are assigned to topics.
- **Cascading**: Queries cascade down the topic tree to all books belonging to those topics.
- **Prioritization**: The last item in the cascade (closest to the book) takes priority.

### 3. Facet Application
The `FacetApplication` connects a Facet to a specific Book or Topic and defines how it is used.
- **Usage Options**:
    - **Section-one**: The LLM suggests a single, central facet instance for the entire section (e.g., the primary geographical setting).
    - **Section-few**: The LLM identifies 3-5 major facet instances that are central to the section.
    - **Content**: The LLM locates all instances of the facet in every paragraph, capturing name, description, and a quote.
    - *Note: "Section-many" is currently not in use.*

## Findings and Identities

The result of a Facet Query is a **Finding**.

### FindingOccurrence
A specific mention found in the text.
- **Data**: Contains the name, description, and supporting quote.
- **Structured Data**: If a JSON schema is provided, the LLM attempts to capture details into `extracted_data`. This allows for specialized rendering (e.g., rendering a time period or a map).

### FindingContext
For "Content" scans, the system consolidates identical occurrences under a single **FindingContext**.
- A single `FindingContext` (e.g., "Frederik the Great") will group multiple `FindingOccurrence` records from different paragraphs.

### FoundIdentity
To uniquely identify entities across the entire system, a `FindingContext` can be bound to a **FoundIdentity**.
- **WikiData Link**: Admins can use a toolbox to locate WikiData QID candidates. The system sends the facet's singular name to fine-tune the WikiData graph queries.
- **Persistence**: Once bound, the identity is unique across the library, allowing for the aggregation of study materials and cross-referencing.

## Admin Administration

### Facet Management
- **Add/Change**: Admins can define new facets with descriptions and machine names. Machine names cannot be changed once in use.
- **Maintenance**: LLM-assisted population of `query_block_lang` for supported languages.
- **Statistics**: Tracking the number of occurrences and contexts for each facet.

### Assignment Workflow
1. **To Topics**: Facets are added to relevant topics in the hierarchy.
2. **To Books**: Books inherit facets from their topics, but specific applications can be adjusted at the book level.
3. **Scanning**: Admins trigger background jobs to scan chapters/sections for the assigned facets.

### Auto-scanning for similar findings across books and chapters

A dedicated screen must be constructed for the staff that maintains facets.
A background system scans for candidates for matches between facets found in various chapters.
The system progresses in a two-level fashion:
- Nightly scans finds coarse candidates for further examination. Fast and expedient but not very precise.
- A more thorough scan compares the triaged candidates with the information available in either Wikipedia and/or the existing material. If an AI deems it a good fit for a match (remember, a chapter will not necessarily contain much revealing information), it receives a suitable score and must be adjudicated by a staff member.

For all findings shown in a section (grouped findings, that is), both users and staff must be able to see how many candidate matches the system has found. Users, because they must be able to poke to a staff that they want those tied together.

Present like this: Leopold I (**3**/_72_) ... meaning 3 AI-recommended strong candidates, 72 coarse matches.
Clicking on that statistics is one way to get to the work area for candidate matches.

### Staff work area

- Tools to select by facet and book and filter by name (broadly inclusive - either the name of the found identity or the candidate identity)
- Column 1: A list of found identities with facets as section headers. The user selects an already found identity. It expands and the dense summary from the current dense summary of all occurrences is shown along with the summary of the wikipedia article.
- Column 2: A list of candidates for the selected found identity. The user clicks on a candidate.
- Column 3: A presentation of reasons for matching (the LLM information) and the occurrences that describe that candidate group/context. The occurrences must contain quotes and descriptions (basically the occurrence list from sections). 
- The user can accept or reject, or just move on to another.
- For each found identity, it must be possible to expand and see the list of books/sections that it already is found in. Bssically a list of sections grouped by books. Sections are name+coded path. Next to it must be an arrow allowing to open the section in a new tab. Each section can click-expand to a list of the group occurrences.
- In this way the user can compare descriptions and quotes from both found and candidate identity.



## Implementation Details

### Data Extraction (Pydantic Scratchpad)
Admins can use a Pydantic scratchpad to define the expected structure of a finding.
```python
import json
from pydantic import BaseModel

class MyModel(BaseModel):
    field1: str
    # ...

print(json.dumps(MyModel.model_json_schema(), indent=2))
```
The resulting JSON schema is stored in `schema_json` and used to constrain the LLM's output.

### Django Model: FacetQuery
The backend uses a `FacetQuery` model to store configuration, including:
- `usage`: (Section, Segment, Content Block)
- `target_quantity`: (One, Few, Many)
- `query_data`: (Full Text, Summary, Findings)
- `render_method`: (Badge, HTML)
- `render_template`: Formatting instructions for structured data.
- `schema_json`: The extraction schema.
