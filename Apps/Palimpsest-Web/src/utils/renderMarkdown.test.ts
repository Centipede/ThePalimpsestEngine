// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './renderMarkdown';

/**
 * The sanitizing half is the point of this helper, so that is what is pinned hardest
 * here: these cases are the shapes a prompt injection in a dossier summary, or a note
 * carried in from somewhere else, would actually arrive in.
 */

describe('renderMarkdown', () => {
  it('renders the markdown an LLM pass or a librarian actually writes', () => {
    const html = renderMarkdown('## Leopold I\n\n- Advises the **King**\n- Appears in `ch9`');
    expect(html).toContain('<h2>Leopold I</h2>');
    expect(html).toContain('<strong>King</strong>');
    expect(html).toContain('<code>ch9</code>');
    expect(html).toContain('<li>');
  });

  it('leaves prose punctuation alone', () => {
    // The worry that kept the dossier unrendered for a while: a stray pair of
    // underscores inside a name turning into silent emphasis.
    expect(renderMarkdown('Named main_part3_ch9 in the manifest.'))
      .toContain('main_part3_ch9');
  });

  it('drops a script tag', () => {
    const html = renderMarkdown('Fine prose.\n\n<script>alert(1)</script>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
    expect(html).toContain('Fine prose.');
  });

  it('drops an event handler on smuggled markup', () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('alert(1)');
  });

  it('drops a javascript: link but keeps its text', () => {
    const html = renderMarkdown('[press here](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('press here');
  });

  it('drops inline svg, which markdown prose has no business carrying', () => {
    const html = renderMarkdown('<svg><use href="#x" /></svg>');
    expect(html).not.toContain('<svg');
  });

  it('breaks single newlines only when the source is written that way', () => {
    expect(renderMarkdown('one\ntwo')).not.toContain('<br');
    expect(renderMarkdown('one\ntwo', { breaks: true })).toContain('<br');
  });

  it('renders nothing for nothing', () => {
    expect(renderMarkdown('')).toBe('');
    expect(renderMarkdown('   \n  ')).toBe('');
    expect(renderMarkdown(null)).toBe('');
    expect(renderMarkdown(undefined)).toBe('');
  });
});
