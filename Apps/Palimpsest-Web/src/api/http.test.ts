// @vitest-environment jsdom
// jsdom for two reasons: buildUrl resolves against window.location, and the module
// graph reaches api.ts -> useAuth, which reads localStorage as it is evaluated.
import { describe, it, expect } from 'vitest';
import { buildUrl, readPage } from './http';

/**
 * The two pure halves of the HTTP layer: what goes into a query string, and how a list
 * response is read back.
 *
 * `request` itself is not covered here - it needs a fetch - and the modules that use it
 * are exercised through their components. These two are worth their own tests because
 * every filter on the match work area passes through buildUrl, and readPage is the only
 * place in the app that understands DRF's pagination envelope.
 */

describe('buildUrl', () => {
    it('joins a multi-valued filter with commas, not repeated keys', () => {
        // Every comma-separated param on these endpoints wants one key.
        const url = buildUrl('/v1/thing/', { of_facet: ['people', 'places'] });
        expect(url).toContain('of_facet=people%2Cplaces');
    });

    it('drops what the caller left unset', () => {
        const url = buildUrl('/v1/thing/', {
            a: null,
            b: undefined,
            c: '',
            d: [],
            e: 'kept',
        });
        expect(url.split('?')[1]).toBe('e=kept');
    });

    it('drops a false flag rather than sending it', () => {
        // These params are all flags whose absence is the default, so `has_candidates=
        // false` would read as a filter rather than as none.
        expect(buildUrl('/v1/thing/', { has_candidates: false })).not.toContain('has_candidates');
        expect(buildUrl('/v1/thing/', { has_candidates: true })).toContain('has_candidates=1');
    });

    it('keeps a zero, which is a real value', () => {
        expect(buildUrl('/v1/thing/', { offset: 0 })).toContain('offset=0');
        expect(buildUrl('/v1/thing/', { min_probability: 0 })).toContain('min_probability=0');
    });
});

describe('readPage', () => {
    const page = { limit: 25, offset: 0 };

    it('reads a DRF envelope', () => {
        const result = readPage<number>({ count: 318, next: 'http://x/?offset=25', results: [1, 2] }, page);
        expect(result.results).toEqual([1, 2]);
        expect(result.count).toBe(318);
        expect(result.hasMore).toBe(true);
    });

    it('reads a bare array as one complete page', () => {
        // These endpoints only paginate when `limit` is sent, and an unpaginated answer
        // must not blank the screen.
        const result = readPage<number>([1, 2, 3], page);
        expect(result).toEqual({ results: [1, 2, 3], count: 3, offset: 0, limit: 3, hasMore: false });
    });

    it('echoes back the requested offset and limit', () => {
        const result = readPage<number>({ count: 318, results: [1] }, { limit: 25, offset: 25 });
        expect(result.offset).toBe(25);
        expect(result.limit).toBe(25);
    });

    it('works out hasMore itself, without the next link', () => {
        // Derived from the counts, so it is right whether or not the server sent a link.
        const last = readPage<number>({ count: 26, results: [26] }, { limit: 25, offset: 25 });
        expect(last.hasMore).toBe(false);

        const middle = readPage<number>({ count: 60, results: new Array(25).fill(0) }, { limit: 25, offset: 25 });
        expect(middle.hasMore).toBe(true);
    });

    it('survives an envelope with nothing in it', () => {
        const result = readPage<number>({}, page);
        expect(result.results).toEqual([]);
        expect(result.count).toBe(0);
        expect(result.hasMore).toBe(false);
    });

    it('reports an empty page past the end without losing the count', () => {
        // What the composable's clamp reads to know it has to go back a page.
        const result = readPage<number>({ count: 318, results: [] }, { limit: 25, offset: 500 });
        expect(result.count).toBe(318);
        expect(result.results).toEqual([]);
    });
});
