# Conversation Tools

Choice: Less focus on the usual "chat-like" solution. More on controlling information flow to the LLM.

## Brainstorm

On each step, the user must be able to control what is being sent to the LLM:

- Caption / summary of whole thread - make toolset.
- Caption for each user-provided input - make toolset.
- Model change... it must be possible to change model midstream if the situation demands it.
- Should we allow adding new system prompts or keep the existing one generic?
- A toolset for modifying the payload of old conversation.
  -  Whole chapters can be radiobutton'ed to just a summary or re-expanded again.
  - Question / answer sections can be radiobutton'ed to summary or re-expanded.
  - Input token count must be shown.
- Add new chapters (again... if already present?): Popup with book / chapter selector.
- Remove old chapters ... overstrike them rather them remove them from the current "**roster**".
- This "roster" will be something that is maintained throughout the conversation: Each step the roster gets converted to a full input.
- Search functionality - add information from text / vector search across the library.
  - Somehow we must cache in the roster what has been found. E.g. list of search hits. ... Using SearchBlocks or converted to paragraphs?
