import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Markdown to HTML for the one job this app has for it: prose written elsewhere - a
 * librarian's study note, or an LLM pass's summary - shown through `v-html`.
 *
 * It exists to be the single place that sanitizes. Every `v-html` in the app routes
 * through here, so the day a prompt injection plants `<img onerror=…>` in a dossier, or a
 * note arrives from a shared library with a script tag in it, there is one function to
 * harden rather than five call sites to find. DOMPurify runs on the html profile alone:
 * markdown prose has no business carrying inline SVG or MathML, and that is where the
 * more interesting sanitizer bypasses live.
 *
 * Needs a DOM, which is the browser everywhere this app runs; a unit test that calls it
 * wants the `@vitest-environment jsdom` pragma.
 */

export interface RenderMarkdownOptions {
  /**
   * Turn a single newline into a line break.
   *
   * Per source, not a house style, because it is a fact about how the text was written.
   * Prose typed into a box uses blank lines for paragraphs and means nothing by its
   * wrapping, so breaks stay off; a pass that writes in wrapped lines needs them on, or
   * its paragraphs collapse into a wall.
   */
  breaks?: boolean;
}

export function renderMarkdown(
  md: string | null | undefined,
  options: RenderMarkdownOptions = {},
): string {
  const source = (md ?? '').trim();
  if (!source) return '';

  const html = marked.parse(source, {
    async: false,
    gfm: true,
    breaks: options.breaks ?? false,
  });

  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
