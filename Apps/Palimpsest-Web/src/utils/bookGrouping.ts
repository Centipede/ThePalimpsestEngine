import type { Book } from '../types/library';

/**
 * Grouping and ordering for the Study Home book list.
 *
 * Grouping always wins over sorting: the list is cut into groups first, and the
 * sort only reorders books inside each group, so a heading never disappears.
 *
 * A book belongs to as many groups as it has authors (or topics), so it can show
 * up more than once. That is intended — a co-authored book genuinely sits under
 * both of its authors — and it is why shownBookCount in BookListView counts
 * distinct ids rather than rows.
 *
 * Kept free of store access so it can be unit-tested directly.
 */

export type GroupMode = 'author' | 'topic';
export type SortMode = 'published' | 'title';
export type SortDirection = 'asc' | 'desc';

export const GROUP_MODES: readonly GroupMode[] = ['author', 'topic'];
export const SORT_MODES: readonly SortMode[] = ['published', 'title'];
export const SORT_DIRECTIONS: readonly SortDirection[] = ['asc', 'desc'];

export interface BookGroup {
  key: string;
  label: string;
  books: Book[];
}

export interface GroupLabels {
  authorLabel: (id: number) => string;
  topicLabel: (id: number) => string;
}

/** Heading for the books that have nothing to group by. Always sorted last. */
const UNGROUPED_LABEL: Record<GroupMode, string> = {
  author: 'Unknown',
  topic: 'No topic',
};

const COLLATION: Intl.CollatorOptions = { sensitivity: 'base', numeric: true };

/**
 * The four-digit year of a publication date, or '' when there is none to be had.
 * Falls back to the leading four characters so a non-ISO string such as
 * '1967?' still yields something orderable.
 */
export function publishedYear(value: string): string {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 4);
  }

  return String(date.getFullYear());
}

/**
 * Every author of a book. Prefers the many-to-many `by_authors`; falls back to
 * the older positional by_author/by_author1..3 quartet for payloads that predate
 * it. Deduplicated, since the two forms can overlap.
 */
export function bookAuthorIds(book: Book): number[] {
  const candidates =
    Array.isArray(book.by_authors) && book.by_authors.length > 0
      ? book.by_authors
      : [book.by_author, book.by_author1, book.by_author2, book.by_author3];

  const ids = new Set<number>();
  for (const id of candidates) {
    if (typeof id === 'number' && id > 0) ids.add(id);
  }

  return [...ids];
}

function bookTopicIds(book: Book): number[] {
  return Array.isArray(book.topics) ? book.topics : [];
}

function compareTitles(a: Book, b: Book): number {
  return a.title.localeCompare(b.title, undefined, COLLATION);
}

/**
 * Orders books within one group. Returns a new array; the input is left alone so
 * callers can sort a store-owned list without mutating it.
 *
 * Books with no usable year park at the end whichever direction the sort runs —
 * flipping to descending should not promote the unknowns to the top. Ties break
 * on title ascending, so equal years keep a readable, stable order.
 */
export function sortBooks(books: Book[], mode: SortMode, direction: SortDirection): Book[] {
  const factor = direction === 'desc' ? -1 : 1;

  return [...books].sort((a, b) => {
    if (mode === 'published') {
      const yearA = publishedYear(a.published);
      const yearB = publishedYear(b.published);

      if (!yearA && !yearB) return compareTitles(a, b);
      if (!yearA) return 1;
      if (!yearB) return -1;

      const byYear = yearA.localeCompare(yearB, undefined, COLLATION);
      return byYear !== 0 ? byYear * factor : compareTitles(a, b);
    }

    return compareTitles(a, b) * factor;
  });
}

/**
 * Cuts the books into groups along one axis, fanning each book out across every
 * author (or topic) it has. Groups come back ordered by label, with the
 * catch-all group last.
 */
export function groupBooks(books: Book[], mode: GroupMode, labels: GroupLabels): BookGroup[] {
  const groups = new Map<number, BookGroup>();
  const ungrouped: Book[] = [];

  for (const book of books) {
    const ids = mode === 'author' ? bookAuthorIds(book) : bookTopicIds(book);

    if (ids.length === 0) {
      ungrouped.push(book);
      continue;
    }

    for (const id of ids) {
      let group = groups.get(id);

      if (!group) {
        group = {
          key: `${mode}:${id}`,
          label: mode === 'author' ? labels.authorLabel(id) : labels.topicLabel(id),
          books: [],
        };
        groups.set(id, group);
      }

      group.books.push(book);
    }
  }

  const ordered = [...groups.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, COLLATION)
  );

  if (ungrouped.length > 0) {
    ordered.push({ key: `${mode}:none`, label: UNGROUPED_LABEL[mode], books: ungrouped });
  }

  return ordered;
}
