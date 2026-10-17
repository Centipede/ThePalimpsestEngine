import { defineStore } from 'pinia';
import { apiFetch } from '../api';
import type { Author, Book, Topic } from '../types/library';

export interface BookByAuthor {
  author: string;
  books: Book[];
}

export interface FlattenedTopic {
  id: number;
  name: string;
  path: string;
  fullPath: string;
  topic: Topic;
}

export const useLibraryStore = defineStore('library', {
  state: () => ({
    authors: [] as Author[],
    books: [] as Book[],
    topics: [] as Topic[],
    isLoadingAuthors: false,
    isLoadingBooks: false,
    isLoadingTopics: false,
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

    flattenedTopics: (state): FlattenedTopic[] => {
      const result: FlattenedTopic[] = [];

      const flatten = (topics: Topic[], parentPath = '') => {
        for (const topic of topics) {
          const fullPath = parentPath ? `${parentPath} > ${topic.name}` : topic.name;
          result.push({
            id: topic.id,
            name: topic.name,
            path: topic.path,
            fullPath,
            topic,
          });
          if (topic.children && topic.children.length > 0) {
            flatten(topic.children, fullPath);
          }
        }
      };

      flatten(state.topics);
      return result;
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

    async fetchTopics(force = false) {
      if (!force && this.topics.length > 0) return;

      this.isLoadingTopics = true;
      this.error = '';
      try {
        const res = await apiFetch('/testbooks/api/v1/topic/?tree=1');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.topics = await res.json();
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Failed to load topics';
        console.error(this.error);
      } finally {
        this.isLoadingTopics = false;
      }
    },

    async updateBook(machine_name: string, data: Partial<Book>) {
      this.isLoadingBooks = true;
      this.error = '';
      try {
        const res = await apiFetch(`/testbooks/api/v1/book/${machine_name}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const updatedBook = await res.json();
        const index = this.books.findIndex((b) => b.machine_name === machine_name);
        if (index !== -1) {
          this.books[index] = updatedBook;
        }
        return updatedBook;
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Failed to update book';
        console.error(this.error);
        throw e;
      } finally {
        this.isLoadingBooks = false;
      }
    },
  },
});
