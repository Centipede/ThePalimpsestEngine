import { describe, it, expect } from 'vitest';
import { ROOT_LABEL, buildJobRows, jobGlyph, jobState, taskRootPath } from './backgroundJobs';
import type { BackgroundJob } from '../types/library';

interface JobStamps {
    started?: string | null;
    stopped?: string | null;
    finished?: string | null;
}

function job(id: number, inSection: string, stamps: JobStamps = {}): BackgroundJob {
    return {
        id,
        in_section: inSection,
        started_at: stamps.started ?? null,
        stopped_at: stamps.stopped ?? null,
        finished_at: stamps.finished ?? null,
        gather_info_status: {
            phase: 'blocks_summarize',
            remaining_blocks: null,
            remaining_facets: null,
        },
    };
}

// The shape the endpoint returns: children first, the parent section's job last.
const taskJobs: BackgroundJob[] = [
    job(1770, 'main.bog5.kap20.afsnit1', { started: '2026-11-12T08:01:41Z' }),
    job(1771, 'main.bog5.kap20.afsnit2'),
    job(1772, 'main.bog5.kap20.afsnit3'),
    job(1778, 'main.bog5.kap20.afsnit9'),
    job(1779, 'main.bog5.kap20.afsnit10'),
    job(1769, 'main.bog5.kap20'),
];

describe('taskRootPath', () => {
    it('picks the shallowest path', () => {
        expect(taskRootPath(taskJobs)).toBe('main.bog5.kap20');
    });

    it('handles a task with a single job', () => {
        expect(taskRootPath([job(1, 'main.bog5.kap20')])).toBe('main.bog5.kap20');
    });

    it('returns an empty path for no jobs', () => {
        expect(taskRootPath([])).toBe('');
    });
});

describe('jobState', () => {
    it('is queued with no timestamps', () => {
        expect(jobState(job(1, 'a'))).toBe('queued');
    });

    it('is running once started but not stopped', () => {
        expect(jobState(job(1, 'a', { started: 'T1' }))).toBe('running');
    });

    it('is stopped once started and stopped', () => {
        expect(jobState(job(1, 'a', { started: 'T1', stopped: 'T2' }))).toBe('stopped');
    });

    it('is finished when finished_at is set, whatever the start/stop pair says', () => {
        expect(jobState(job(1, 'a', { started: 'T1', finished: 'T3' }))).toBe('finished');
        expect(jobState(job(1, 'a', { started: 'T1', stopped: 'T2', finished: 'T3' }))).toBe('finished');
        expect(jobState(job(1, 'a', { finished: 'T3' }))).toBe('finished');
    });
});

describe('jobGlyph', () => {
    it('gives one distinct character per state', () => {
        const glyphs = (['queued', 'running', 'stopped', 'finished'] as const).map(jobGlyph);
        expect(glyphs).toEqual(['◌', '◐', '●', '✔']);
        expect(new Set(glyphs).size).toBe(4);
        expect(glyphs.every((g) => [...g].length === 1)).toBe(true);
    });
});

describe('buildJobRows', () => {
    it('puts the parent job first and sorts children numerically', () => {
        expect(buildJobRows(taskJobs).map((row) => row.label)).toEqual([
            ROOT_LABEL, 'afsnit1', 'afsnit2', 'afsnit3', 'afsnit9', 'afsnit10',
        ]);
    });

    it('indents children one level below the root', () => {
        const rows = buildJobRows(taskJobs);
        expect(rows[0].depth).toBe(0);
        expect(rows.slice(1).every((row) => row.depth === 1)).toBe(true);
    });

    it('nests grandchildren under their own parent', () => {
        const rows = buildJobRows([
            job(3, 'main.kap1.afsnit2'),
            job(2, 'main.kap1.afsnit1.under1'),
            job(4, 'main.kap1.afsnit1'),
            job(1, 'main.kap1'),
        ]);
        expect(rows.map((row) => [row.label, row.depth])).toEqual([
            [ROOT_LABEL, 0],
            ['afsnit1', 1],
            ['afsnit1.under1', 2],
            ['afsnit2', 1],
        ]);
    });

    it('carries the state of each job through', () => {
        const rows = buildJobRows(taskJobs);
        expect(rows.find((row) => row.label === 'afsnit1')?.state).toBe('running');
        expect(rows.find((row) => row.label === 'afsnit2')?.state).toBe('queued');
    });

    it('labels a single-job task as the root', () => {
        const rows = buildJobRows([job(1, 'main.bog5.kap20')]);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ label: ROOT_LABEL, depth: 0 });
    });

    it('keeps the full path for a job that is not under the root', () => {
        const rows = buildJobRows([job(1, 'main.kap1'), job(2, 'other.kap9')]);
        const stray = rows.find((row) => row.job.id === 2);
        expect(stray).toMatchObject({ label: 'other.kap9', depth: 0 });
    });
});
