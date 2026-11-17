import { describe, it, expect } from 'vitest';
import {
  bookAuthorIds,
  groupBooks,
  publishedYear,
  sortBooks,
  type BookGroup,
} from './bookGrouping';
import type { Book } from '../types/library';

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 1,
    title: 'Untitled',
    published: '1900-01-01',
    by_author: 7,
    by_author1: null,
    by_author2: null,
    by_author3: null,
    by_authors: [7],
    topics: [],
    facet_applications: [],
    facet_applications_cascaded: [],
    ...overrides,
  } as unknown as Book;
}

const labels = {
  authorLabel: (id: number) => `Author ${id}`,
  topicLabel: (id: number) => `Topic ${id}`,
};

function shape(groups: BookGroup[]) {
  return groups.map((group) => [group.label, group.books.map((book) => book.id)]);
}

describe('bookAuthorIds', () => {
  it('prefers the many-to-many by_authors', () => {
    const book = makeBook({ by_author: 7, by_authors: [7, 12] });
    expect(bookAuthorIds(book)).toEqual([7, 12]);
  });

  it('falls back to the legacy quartet when by_authors is empty', () => {
    const book = makeBook({ by_authors: [], by_author: 7, by_author2: 9 });
    expect(bookAuthorIds(book)).toEqual([7, 9]);
  });

  it('falls back when by_authors is missing entirely', () => {
    const book = makeBook({ by_author: 4, by_author1: 5 });
    delete (book as Partial<Book>).by_authors;
    expect(bookAuthorIds(book)).toEqual([4, 5]);
  });

  it('deduplicates and drops absent ids', () => {
    const book = makeBook({ by_authors: [], by_author: 7, by_author1: 7, by_author2: null });
    expect(bookAuthorIds(book)).toEqual([7]);
  });

  it('returns nothing when a book has no author at all', () => {
    const book = makeBook({ by_authors: [], by_author: 0 as unknown as number });
    expect(bookAuthorIds(book)).toEqual([]);
  });
});

describe('groupBooks', () => {
  it('lists a co-authored book under each of its authors', () => {
    const books = [
      makeBook({ id: 1, title: 'Summa', by_authors: [7, 12] }),
      makeBook({ id: 2, title: 'Politics', by_authors: [7] }),
    ];

    // Numeric collation: 'Author 7' before 'Author 12', so a label like
    // 'VKH 2' also precedes 'VKH 10' rather than following it.
    expect(shape(groupBooks(books, 'author', labels))).toEqual([
      ['Author 7', [1, 2]],
      ['Author 12', [1]],
    ]);
  });

  it('lists a multi-topic book under each of its topics', () => {
    const books = [
      makeBook({ id: 1, topics: [3, 1] }),
      makeBook({ id: 2, topics: [1] }),
    ];

    expect(shape(groupBooks(books, 'topic', labels))).toEqual([
      ['Topic 1', [1, 2]],
      ['Topic 3', [1]],
    ]);
  });

  it('orders groups by label, with the catch-all group last', () => {
    const books = [
      makeBook({ id: 1, topics: [] }),
      makeBook({ id: 2, topics: [2] }),
      makeBook({ id: 3, topics: [1] }),
    ];

    expect(shape(groupBooks(books, 'topic', labels))).toEqual([
      ['Topic 1', [3]],
      ['Topic 2', [2]],
      ['No topic', [1]],
    ]);
  });

  it('labels the authorless catch-all group Unknown', () => {
    const books = [makeBook({ id: 1, by_authors: [], by_author: 0 as unknown as number })];

    expect(shape(groupBooks(books, 'author', labels))).toEqual([['Unknown', [1]]]);
  });

  it('returns no groups for no books', () => {
    expect(groupBooks([], 'author', labels)).toEqual([]);
  });
});

describe('sortBooks', () => {
  const books = [
    makeBook({ id: 1, title: 'Politics', published: '2007-01-01' }),
    makeBook({ id: 2, title: 'Confessions', published: '0397-01-01' }),
    makeBook({ id: 3, title: 'Ethics', published: '1677-01-01' }),
  ];

  it('sorts by published year, oldest first', () => {
    expect(sortBooks(books, 'published', 'asc').map((b) => b.id)).toEqual([2, 3, 1]);
  });

  it('sorts by published year, newest first', () => {
    expect(sortBooks(books, 'published', 'desc').map((b) => b.id)).toEqual([1, 3, 2]);
  });

  it('sorts by title in both directions', () => {
    expect(sortBooks(books, 'title', 'asc').map((b) => b.id)).toEqual([2, 3, 1]);
    expect(sortBooks(books, 'title', 'desc').map((b) => b.id)).toEqual([1, 3, 2]);
  });

  it('breaks equal years on title, ascending, whichever way the sort runs', () => {
    const sameYear = [
      makeBook({ id: 1, title: 'Zeta', published: '1500-01-01' }),
      makeBook({ id: 2, title: 'Alpha', published: '1500-01-01' }),
    ];

    expect(sortBooks(sameYear, 'published', 'asc').map((b) => b.id)).toEqual([2, 1]);
    expect(sortBooks(sameYear, 'published', 'desc').map((b) => b.id)).toEqual([2, 1]);
  });

  it('parks books with no usable year last in both directions', () => {
    const withUndated = [
      makeBook({ id: 1, title: 'Undated', published: '' }),
      makeBook({ id: 2, title: 'Dated', published: '1800-01-01' }),
    ];

    expect(sortBooks(withUndated, 'published', 'asc').map((b) => b.id)).toEqual([2, 1]);
    expect(sortBooks(withUndated, 'published', 'desc').map((b) => b.id)).toEqual([2, 1]);
  });

  it('does not mutate the input array', () => {
    const original = [...books];
    sortBooks(books, 'published', 'desc');
    expect(books).toEqual(original);
  });
});

describe('publishedYear', () => {
  it('reads the year from an ISO date', () => {
    expect(publishedYear('1967-01-01')).toBe('1967');
  });

  it('falls back to the leading four characters of an unparseable value', () => {
    expect(publishedYear('1967?')).toBe('1967');
  });

  it('returns nothing for an empty value', () => {
    expect(publishedYear('')).toBe('');
  });
});
