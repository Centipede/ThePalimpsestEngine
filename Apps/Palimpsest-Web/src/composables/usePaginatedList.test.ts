import { describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';
import { usePaginatedList } from './usePaginatedList';
import type { Page, PageRequest } from '../api/http';

/**
 * The offset state machine behind both columns of the match work area.
 *
 * Worth its own suite rather than only being exercised through the screen, because two
 * of its behaviours are invisible until they go wrong: the superseded-response guard,
 * and the clamp that rescues an offset left past the end after a decision.
 */

function page<T>(results: T[], count: number, request: PageRequest): Page<T> {
    return {
        results,
        count,
        offset: request.offset,
        limit: request.limit,
        hasMore: request.offset + results.length < count,
    };
}

/** A fetcher over a fixed corpus of numbers, and a record of what it was asked for. */
function numbers(total: number) {
    const calls: PageRequest[] = [];
    const fetcher = (request: PageRequest) => {
        calls.push({ ...request });
        const slice = Array.from({ length: total }, (_, i) => i)
            .slice(request.offset, request.offset + request.limit);
        return Promise.resolve(page(slice, total, request));
    };
    return { calls, fetcher };
}

/** A fetcher whose replies are resolved by hand, in whatever order the test likes. */
function deferred<T>() {
    const resolvers: ((value: Page<T>) => void)[] = [];
    const calls: PageRequest[] = [];
    const fetcher = (request: PageRequest) => {
        calls.push({ ...request });
        return new Promise<Page<T>>(resolve => { resolvers.push(resolve); });
    };
    return { calls, resolvers, fetcher };
}

describe('usePaginatedList', () => {
    it('loads the first page as it is created', async () => {
        const { calls, fetcher } = numbers(10);
        const list = usePaginatedList<number>(fetcher);
        await vi.waitUntil(() => list.items.value.length > 0);

        expect(calls[0]).toEqual({ limit: 25, offset: 0 });
        expect(list.count.value).toBe(10);
        expect(list.rangeLabel.value).toBe('1–10 of 10');
    });

    it('can be told to wait, for a list with nothing to ask for yet', async () => {
        const { calls, fetcher } = numbers(10);
        const list = usePaginatedList<number>(fetcher, { immediate: false });
        await nextTick();
        expect(calls).toEqual([]);
        expect(list.items.value).toEqual([]);
    });

    it('pages forward and back, and clamps at both ends', async () => {
        const { fetcher } = numbers(60);
        const list = usePaginatedList<number>(fetcher, { limit: 25 });
        await vi.waitUntil(() => list.items.value.length > 0);

        expect(list.hasPrev.value).toBe(false);
        await list.prev();
        expect(list.offset.value).toBe(0);

        await list.next();
        expect(list.offset.value).toBe(25);
        expect(list.rangeLabel.value).toBe('26–50 of 60');

        await list.next();
        expect(list.offset.value).toBe(50);
        expect(list.rangeLabel.value).toBe('51–60 of 60');
        expect(list.hasNext.value).toBe(false);

        await list.next();
        expect(list.offset.value).toBe(50);

        await list.prev();
        expect(list.offset.value).toBe(25);
    });

    it('says so plainly when there is nothing', async () => {
        const { fetcher } = numbers(0);
        const list = usePaginatedList<number>(fetcher);
        await vi.waitUntil(() => list.count.value === 0 && !list.isLoading.value);
        expect(list.rangeLabel.value).toBe('No matches');
    });

    it('resets the offset on reload and keeps it on refresh', async () => {
        const { calls, fetcher } = numbers(60);
        const list = usePaginatedList<number>(fetcher);
        await vi.waitUntil(() => list.items.value.length > 0);
        await list.next();
        expect(list.offset.value).toBe(25);

        await list.refresh();
        expect(list.offset.value).toBe(25);
        expect(calls[calls.length - 1]).toEqual({ limit: 25, offset: 25 });

        await list.reload();
        expect(list.offset.value).toBe(0);
    });

    it('starts over when the page size changes', async () => {
        const { calls, fetcher } = numbers(60);
        const list = usePaginatedList<number>(fetcher);
        await vi.waitUntil(() => list.items.value.length > 0);
        await list.next();

        await list.setLimit(50);
        expect(list.limit.value).toBe(50);
        expect(list.offset.value).toBe(0);
        expect(calls[calls.length - 1]).toEqual({ limit: 50, offset: 0 });
    });

    it('lets the newest request win when replies come back out of order', async () => {
        /**
         * The bug this guard exists for: typing in the search box fires overlapping
         * requests, and without it an earlier reply lands last and the column shows the
         * results for a prefix of what is in the box.
         */
        const { resolvers, fetcher } = deferred<string>();
        const list = usePaginatedList<string>(fetcher);
        await nextTick();

        const second = list.reload();
        await nextTick();
        expect(resolvers).toHaveLength(2);

        // The newer request answers first, then the one it superseded.
        resolvers[1]({ results: ['new'], count: 1, offset: 0, limit: 25, hasMore: false });
        resolvers[0]({ results: ['old'], count: 99, offset: 0, limit: 25, hasMore: true });
        await second;
        await nextTick();

        expect(list.items.value).toEqual(['new']);
        expect(list.count.value).toBe(1);
    });

    it('keeps the page on screen while the next one loads', async () => {
        const { resolvers, fetcher } = deferred<string>();
        const list = usePaginatedList<string>(fetcher);
        await nextTick();
        resolvers[0]({ results: ['a'], count: 60, offset: 0, limit: 25, hasMore: true });
        await vi.waitUntil(() => list.items.value.length > 0);

        const paging = list.next();
        await nextTick();
        // Still the old page, dimmed by the view rather than blanked by this.
        expect(list.isLoading.value).toBe(true);
        expect(list.items.value).toEqual(['a']);

        resolvers[1]({ results: ['b'], count: 60, offset: 25, limit: 25, hasMore: true });
        await paging;
        expect(list.items.value).toEqual(['b']);
    });

    it('falls back a page when the offset is left past the end', async () => {
        /**
         * What happens after the last rows of a page are decided away: the offset is
         * still 50, the server has only 30 rows left, and an empty column over "30
         * matches" would be a dead end with no way back but the Prev button.
         */
        const calls: PageRequest[] = [];
        const fetcher = (request: PageRequest) => {
            calls.push({ ...request });
            // 30 rows remain; anything from offset 25 up is empty.
            const results = request.offset === 0
                ? Array.from({ length: 25 }, (_, i) => i)
                : request.offset === 25
                    ? [25, 26, 27, 28, 29]
                    : [];
            return Promise.resolve(page(results, 30, request));
        };

        const list = usePaginatedList<number>(fetcher, { limit: 25 });
        await vi.waitUntil(() => list.items.value.length > 0);

        // Land on a page that no longer exists.
        list.offset.value = 100;
        await list.refresh();

        expect(calls.map(c => c.offset)).toContain(25);
        expect(list.offset.value).toBe(25);
        expect(list.items.value).toEqual([25, 26, 27, 28, 29]);
    });

    it('clamps at most once, so a disagreeing server cannot loop', async () => {
        // A server that always answers empty with a count would otherwise recurse.
        const calls: PageRequest[] = [];
        const fetcher = (request: PageRequest) => {
            calls.push({ ...request });
            return Promise.resolve(page<number>([], 300, request));
        };

        const list = usePaginatedList<number>(fetcher, { limit: 25 });
        await vi.waitUntil(() => calls.length > 0 && !list.isLoading.value);
        list.offset.value = 100;
        await list.refresh();

        // The initial load plus the refresh plus one clamp, and no more.
        expect(calls.length).toBeLessThanOrEqual(3);
    });

    it('reports a failure without throwing, and keeps the rows it had', async () => {
        let fail = false;
        const fetcher = (request: PageRequest) => (fail
            ? Promise.reject(new Error('The server said no.'))
            : Promise.resolve(page([1, 2], 2, request)));

        const list = usePaginatedList<number>(fetcher);
        await vi.waitUntil(() => list.items.value.length > 0);

        fail = true;
        await list.refresh();
        expect(list.error.value).toBe('The server said no.');
        expect(list.items.value).toEqual([1, 2]);
        expect(list.isLoading.value).toBe(false);
    });

    it('does not report an abort, which is its own doing', async () => {
        const fetcher = (_request: PageRequest, signal: AbortSignal) =>
            new Promise<Page<number>>((_resolve, reject) => {
                signal.addEventListener('abort', () => {
                    const error = new Error('aborted');
                    error.name = 'AbortError';
                    reject(error);
                });
            });

        const list = usePaginatedList<number>(fetcher);
        await nextTick();
        // Supersede the in-flight request, which aborts it.
        void list.reload();
        await nextTick();
        expect(list.error.value).toBe('');
    });
});
