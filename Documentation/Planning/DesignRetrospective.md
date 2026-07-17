# Goal and Conclusions from the Test Project

Over the past year of using the test project, I have become increasingly aware of a number of design limitations and have identified many features that need to be addressed at a higher architectural level.

This document is a starting point for the overall direction of this project.

Since I already rely on the test project (see `README.md`) in my daily work, this project will initially build on top of it. Although the project will not be useful to the public until it reaches a certain level of maturity, I can begin developing the new front end immediately without first having to reimplement the entire back end.

## More about the test project

Originally, I only had a reader application written in Qt for the iPad with Apple Pencil interaction. The Django server merely provided a simple REST API.

I soon discovered that developing in Django allowed me to move much faster by relying on conventional web technologies. The entire OCR conversion system therefore evolved into a traditional Django application.

Today, the iPad application offers very little—in fact, it no longer compiles.

Fortunately, I can usually fit my 2020 MacBook Air beside the book while studying. That works well enough, but I still miss the tablet experience surprisingly often.

Today I primarily use the system for studies that involve extensive AI-assisted note-taking (see the section *Different Kinds of Study*):

* Read a chapter and discuss it with the AI.
* Ask the AI to test me with questions and self-examinations. This works remarkably well.
* Generate summaries, identify named entities, and all the other expected AI-assisted features.

---

## Biggest pain points and lessons learned

### Different kinds of study

Some books I simply want to work through relatively quickly. By *quickly*, I mean reading them without highlighting or making margin notes.

Other books deserve careful examination and extensive annotation.

The balance between my own writing and AI-generated content is critical for effective self-study.

When I need to learn something, I need to write, annotate, highlight, and actively engage with the material.

I primarily use AI to enrich the book with additional explanations and modern context—features that will probably become commonplace over the next few years.

While I was developing these fairly traditional study tools, the AI revolution happened. The entire purpose and methodology of studying now has to adapt to the realities of 2026, while still preserving meaningful student involvement.

### Student involvement that works

* "Ask me ten questions about this chapter and its subchapters. Critique my answers."
* "Create an outline for an article about..." after which I rewrite and expand it myself.

  * However, I still spend too much time incorporating information from newly read chapters. This becomes even more problematic when working across multiple books that were not available when the original AI-generated material was created.

### Student involvement that works poorly

* Adding AI-generated notes to manually highlighted passages.

  * I implemented tools such as "Summarize the highlighted text" and "Extract *N* key points." These are somewhat more tablet-friendly but ultimately underwhelming. They need significantly richer context before the AI can produce consistently useful results.
* Generating multiple alternative summaries for easy selection with the Apple Pencil. This also proved less useful than expected.
* A possible improvement would be to let handwritten notes guide subsequent AI processing.
* Supporting handwriting recognition is another possibility, although it currently feels like the wrong direction.

### AI-generated features that simply work

* Chapter summaries.
* Key events.
* Important people.
* Locations.
* Historical periods.
* Named entities in general.

However, configuring these features is surprisingly difficult. Different books require different kinds of summaries and different forms of entity extraction.

One difficult design decision still remains:

Should AI-generated summaries belong to the book itself, or should they belong to a particular study that happens to use the book?

---

### Paragraph structure

Many books have poor paragraph structure.

Some paragraphs are far too long, while others are extremely short.

Fiction often alternates between dialogue—with abundant line breaks—and prose that behaves similarly. Non-fiction can contain paragraphs spanning several pages.

These extremes make paragraph-level summarisation much less effective than one might expect.

---

### Multi-book studies

This quickly emerged as something I had deliberately postponed.

Working within a single book functions reasonably well, but serious study inevitably spans multiple books.

The system therefore needs a concept of a *study*: a collection of books organised around a particular subject.

For example:

> Gather all my books on sociology and behaviourism and construct a study about *nature versus nurture*.

History illustrates the problem particularly well. There is a strong need to organise material according to thematic perspectives rather than individual books.

Examples include:

* English politics as it relates to France (1300–1700).
* The development of constitutional monarchy.
* The history of religious toleration.

Supporting this kind of work requires an entirely different set of tools.

---

### Computer vs. tablet + pen vs. phone

#### Laptop

* The best platform for substantial writing.
* Excellent for precise editing and formatting.
* Ideal for Markdown.
* Keyboard shortcuts greatly improve AI interaction.
* Easy to organise notes and research.

#### Tablet

* Extremely portable.
* Can comfortably sit beside the physical book.
* Apple Pencil enables natural highlighting and annotation.
* Colour management for highlights remains awkward. I often use colours consistently within a particular book or study.
* Lack of a physical keyboard has become a much bigger limitation in the AI era.
* Writing *why* something was highlighted is often more valuable than the highlight itself.
* On-screen keyboards remain frustrating for serious note-taking.
* VPNs and private network access are more cumbersome than on a laptop (see *Security and VPN*).

#### Phone

* I occasionally miss having a lightweight mobile version.
* Always available.
* Well suited for quick conversations with the AI, searches, and reviewing chapter summaries.
* Unsuitable for substantial writing.
* VPNs and private networking are also more cumbersome.

---

### Security and VPN

Studying is inherently a private activity.

You purchase a book, scan it for your own use, and study it. Uploading an entire copyrighted work to a public service introduces legal and privacy concerns that cannot be solved by a password alone.

Years ago I learned enough cryptography and networking to build a secure solution, but doing so slowed development considerably.

Today I simply connect through a VPN from my MacBook and use an `/etc/hosts` entry to simplify access to my local Django server.

That is acceptable for a prototype, but it is clearly not the long-term solution.
