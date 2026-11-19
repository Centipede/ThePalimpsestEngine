# The Palimpsest Engine


A study environment for people who still need books and paper.

The Palimpsest Engine depends upon its sister project:
[The AetherGraph Engine](https://github.com/Centipede/TheAethergraphEngine)

**AetherGraph** is a user-friendly but mostly manual tool for rebuilding the chapter structure of scanned books and of repairing OCR.

**Palimpsest** is a small, but growing, project aimed at study of the books that one owns and scans. It is more of a study system than a RAG system.

## Status
**November 18th 2026: Facets/findings added to the system. Search/selection has been expanded into a node-based system.
The UI is in daily use, but only running up against the test server (explained later) which still is 100% old spaghetti code.**

## Roadmap
Two database constructions must be changed before a new Django server will commence development in this project. Round-trip from/to AetherGraph must also work:

1. Sections (chapters) exists as trees under an overarching concept called flows. Now we want to mix flows and sections (parallel and sequential sections) anywhere in the tree.
2. The old system used page numbers. Must transition to page names (iii, A1, 81).
3. The system must be hardened to handle export of books/pages/sections to AetherGraph for fixes and rework. Re-import must not change anything not touched. LLM-generated information must not be lost because a book changes section machine names.



## Prelude

In my view, studying books requires support on several levels:

* Remembering recently read chapters.
* Building understanding across multiple books.
* Providing the question-and-answer tools people have come to expect today.
* Helping readers rediscover passages they have already encountered instead of generating ever-growing heaps of new verbiage.
* Assisting with self-examination and revision.
* Assisting in writing study notes and articles.
* Making it possible to step away from a subject for weeks or months and quickly regain one's footing later.

I am fond of the many new tools that have appeared since the explosion of AI, but to me they often fail at helping the self-studying reader remember *through* the material. 
Too often, one ends up with a long list of conversations blended together from an entire library — philosophy, sociology, political science, economics — all rolled into one indistinguishable stream.

What is needed is a *platform* in which one can experiment with ways to combine AI, graphics, WikiData, and other technologies.
It must be dynamic and flexible enough to allow experimentation and personalisation.

There is no way around an evolutionary process: some ideas survive, others do not.
The faster one can iterate over tools, prompts, workflows, and scripts, the better.



### This Project – The Background Story

I originally addressed these practical challenges the hard way—with a quick-and-dirty web application. It was spaghetti
code, never meant for public consumption, but it has served me well for over a year.

Now, the time has come to share the useful parts publicly. To do that, I need to rewrite components that I can tolerate
personally but that are not acceptable in a public-facing application.

OCR is one part of the equation; the actual study tool is another.

This project is a sister project to my study tool, which currently runs on my personal server. It, too, requires
restructuring before it can be made public.

Starting today (commit #1), I will dedicate a steady—though limited—amount of spare time to incorporating the lessons
learned and migrating the useful components from the experimental project.

## The Names

No way around it. ChatGPT and I entertained each other with an enthusiastic joint venture of steampunk, faux victorian
naming fun.

## Planning

As I already have a test project working, I will take an approach that is unusual in the public sphere:
I will write **planning documents** that aim at summing up all the lessons I have learned.


**Rene Jensen**
[rene@catatonic.dk](mailto:rene@catatonic.dk)
