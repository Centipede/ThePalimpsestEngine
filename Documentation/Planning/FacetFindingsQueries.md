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
