import { describe, it, expect } from 'vitest';
import {
    candidateChipLink,
    candidateSectionPath,
    chipTooltip,
    defaultFilters,
    effectiveScore,
    formatScore,
    hasCandidates,
    parseFindingsQuery,
    toFindingsQuery,
} from './findingCandidateQuery';
import type { CandidateCounts, MatchFilters } from '../types/identityMatches';

function counts(over: Partial<CandidateCounts> = {}): CandidateCounts {
    return { basis: 'identity', of: 17, compared: 3, triage: 72, ...over };
}

describe('parseFindingsQuery', () => {
    it('reads an empty query as the defaults', () => {
        expect(parseFindingsQuery({})).toEqual(defaultFilters());
    });

    it('reads a full query', () => {
        expect(parseFindingsQuery({
            facet: 'people,places',
            book: 'belu-soconreal',
            q: 'leopold',
            candidates: '1',
            order: 'pending',
            stage: 'compared',
            verdict: 'all',
            candidate_order: 'reading',
            identity: '17',
        })).toEqual({
            facets: ['people', 'places'],
            bookMn: 'belu-soconreal',
            q: 'leopold',
            onlyWithCandidates: true,
            identityOrder: 'pending',
            stages: ['compared'],
            verdict: 'all',
            candidateOrder: 'reading',
            identityId: 17,
            contextId: null,
        });
    });

    it('drops the empty segments of a comma list', () => {
        // A trailing comma is what a filter bar leaves behind when the last tag is
        // switched off, so it has to mean "two facets", not "three".
        expect(parseFindingsQuery({ facet: 'people,,places,' }).facets)
            .toEqual(['people', 'places']);
    });

    it('falls back to the default for an unknown enum rather than passing it on', () => {
        const filters = parseFindingsQuery({
            order: 'sideways',
            verdict: 'maybe',
            candidate_order: 'alphabetical',
            stage: 'guessed',
        });
        expect(filters.identityOrder).toBe('facet');
        expect(filters.verdict).toBe('pending');
        expect(filters.candidateOrder).toBe('best');
        expect(filters.stages).toEqual([]);
    });

    it('reads an unparseable id as nothing pinned, never as NaN', () => {
        // NaN would reach the URL as `/found-identity/NaN/` and 404.
        expect(parseFindingsQuery({ identity: 'abc' }).identityId).toBeNull();
        expect(parseFindingsQuery({ identity: '-4' }).identityId).toBeNull();
        expect(parseFindingsQuery({ identity: '0' }).identityId).toBeNull();
        expect(parseFindingsQuery({ context: '1.5' }).contextId).toBeNull();
    });

    it('lets an identity pin win over a context pin', () => {
        // The two ask opposite questions, so column 2 has to be told which one.
        const filters = parseFindingsQuery({ identity: '17', context: '501' });
        expect(filters.identityId).toBe(17);
        expect(filters.contextId).toBeNull();
    });

    it('takes the last value when the router hands back a repeated key', () => {
        expect(parseFindingsQuery({ q: ['first', 'second'] }).q).toBe('second');
    });
});

describe('toFindingsQuery', () => {
    it('writes nothing for a screen that has been left alone', () => {
        expect(toFindingsQuery(defaultFilters())).toEqual({});
    });

    it('round-trips a fully populated state', () => {
        const filters: MatchFilters = {
            facets: ['people', 'places'],
            bookMn: 'belu-soconreal',
            q: 'leopold',
            onlyWithCandidates: true,
            identityOrder: 'recent',
            stages: ['triage', 'compared'],
            verdict: 'rejected',
            candidateOrder: 'newest',
            identityId: 17,
            contextId: null,
        };
        expect(parseFindingsQuery(toFindingsQuery(filters))).toEqual(filters);
    });

    it('round-trips a context pin', () => {
        const filters: MatchFilters = { ...defaultFilters(), contextId: 501 };
        expect(parseFindingsQuery(toFindingsQuery(filters))).toEqual(filters);
    });

    it('trims the search term it writes', () => {
        expect(toFindingsQuery({ ...defaultFilters(), q: '  leopold  ' })).toEqual({ q: 'leopold' });
    });
});

describe('hasCandidates', () => {
    it('is false for nothing at all and for a scan that found nothing', () => {
        expect(hasCandidates(null)).toBe(false);
        expect(hasCandidates(undefined)).toBe(false);
        expect(hasCandidates(counts({ compared: 0, triage: 0 }))).toBe(false);
    });

    it('is true when either figure is non-zero', () => {
        expect(hasCandidates(counts({ compared: 0, triage: 1 }))).toBe(true);
        expect(hasCandidates(counts({ compared: 1, triage: 0 }))).toBe(true);
    });
});

describe('candidateChipLink', () => {
    it('points at the identity, straight to the compared candidates', () => {
        expect(candidateChipLink(counts())).toEqual({ identity: '17', stage: 'compared' });
    });

    it('asks for both stages when nothing has been close-read yet', () => {
        expect(candidateChipLink(counts({ compared: 0 })))
            .toEqual({ identity: '17', stage: 'triage,compared' });
    });

    it('points at the context in the inverted case', () => {
        expect(candidateChipLink(counts({ basis: 'context', of: 501 })))
            .toEqual({ context: '501', stage: 'compared' });
    });

    it('declines without a usable basis, so the chip stays inert', () => {
        // A link landing on an unfiltered work area is worse than no link.
        expect(candidateChipLink(null)).toBeNull();
        expect(candidateChipLink(counts({ compared: 0, triage: 0 }))).toBeNull();
        expect(candidateChipLink(counts({ basis: 'whatever' as 'identity' }))).toBeNull();
        expect(candidateChipLink(counts({ of: 0 }))).toBeNull();
    });
});

describe('chipTooltip', () => {
    it('names both figures and says who decides', () => {
        const text = chipTooltip(counts());
        expect(text).toContain('3 strong candidate matches');
        expect(text).toContain('72 possible ones');
        expect(text).toContain('librarian');
    });

    it('says what it is about in the inverted case', () => {
        expect(chipTooltip(counts({ basis: 'context' }))).toContain('unidentified finding');
    });

    it('counts in the singular where it should', () => {
        const text = chipTooltip(counts({ compared: 1, triage: 1 }));
        expect(text).toContain('1 strong candidate match ');
        expect(text).toContain('1 possible one');
    });
});

describe('effectiveScore', () => {
    it('prefers the close reading over the coarse guess', () => {
        expect(effectiveScore({ probability: 0.91, triage_probability: 0.83 })).toBe(0.91);
    });

    it('treats a compared score of zero as a judgement, not as absent', () => {
        // `||` here would quietly report the triage guess as the LLM's verdict.
        expect(effectiveScore({ probability: 0, triage_probability: 0.83 })).toBe(0);
    });

    it('falls back to the coarse score, and then to nothing', () => {
        expect(effectiveScore({ probability: null, triage_probability: 0.83 })).toBe(0.83);
        expect(effectiveScore({ probability: null, triage_probability: null })).toBeNull();
    });
});

describe('formatScore', () => {
    it('rounds to a percentage, and says nothing when unscored', () => {
        expect(formatScore({ probability: 0.914, triage_probability: null })).toBe('91%');
        expect(formatScore({ probability: 0, triage_probability: null })).toBe('0%');
        expect(formatScore({ probability: null, triage_probability: null })).toBe('—');
    });
});

describe('candidateSectionPath', () => {
    it('builds the reading route from the denormalised pair', () => {
        expect(candidateSectionPath({
            in_book_mn: 'belu-soconreal',
            in_section_pf: 'main.part3.ch9',
        })).toBe('/study/belu-soconreal/section/main.part3.ch9');
    });

    it('has no route for an unplaced candidate', () => {
        expect(candidateSectionPath({ in_book_mn: null, in_section_pf: null })).toBeNull();
        expect(candidateSectionPath({ in_book_mn: 'belu', in_section_pf: null })).toBeNull();
    });
});
