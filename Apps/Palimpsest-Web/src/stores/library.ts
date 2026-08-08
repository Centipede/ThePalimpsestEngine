import { defineStore } from 'pinia';
import { apiFetch } from '../api';
import type { Author, Book } from '../types/library';

export interface BookByAuthor {
  author: string;
  books: Book[];
}

export const useLibraryStore = defineStore('library', {
  state: () => ({
    authors: [] as Author[],
    books: [] as Book[],
    isLoadingAuthors: false,
    isLoadingBooks: false,
    error: '' as string,
  }),

  getters: {
    getAuthorById: (state) => (id: number | null) => {
      return state.authors.find((a) => a.id === id);
    },

    booksByAuthor: (state): BookByAuthor[] => {
      const groups = new Map<number | null, Book[]>();

      for (const book of state.books) {
        const author = book.by_author || null;

        if (!groups.has(author)) {
          groups.set(author, []);
        }

        groups.get(author)?.push(book);
      }

      return Array.from(groups.entries()).map(([authorId, groupedBooks]) => ({
        author: state.authors.find((a) => a.id === authorId)?.abbrev || 'Unknown',
        books: groupedBooks,
      }));
    },
  },

  actions: {
    async fetchAuthors(force = false) {
      if (!force && this.authors.length > 0) return;

      this.isLoadingAuthors = true;
      this.error = '';
      try {
        const res = await apiFetch('/testbooks/api/v1/author/');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.authors = await res.json();
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Failed to load authors';
        console.error(this.error);
      } finally {
        this.isLoadingAuthors = false;
      }
    },

    async fetchBooks(force = false) {
      if (!force && this.books.length > 0) return;

      this.isLoadingBooks = true;
      this.error = '';
      try {
        const res = await apiFetch('/testbooks/api/v1/book/');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.books = await res.json();
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Failed to load books';
        console.error(this.error);
      } finally {
        this.isLoadingBooks = false;
      }
    },
  },
});
