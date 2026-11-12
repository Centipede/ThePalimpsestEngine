import type { BackgroundJob } from '../types/library';

/**
 * What a job's timestamps say about it. `stopped` means a thread picked the job up and
 * released it again without finishing: more work remains, but nothing is running.
 */
export type JobState = 'queued' | 'running' | 'stopped' | 'finished';

/** The label used for the task's own root section, which has no path below the root. */
export const ROOT_LABEL = '(root)';

export interface JobRow {
    job: BackgroundJob;
    /** Dot-segments below the task root; 0 for the root job itself. */
    depth: number;
    /** The path relative to the task root, or ROOT_LABEL. */
    label: string;
    state: JobState;
}

const GLYPHS: Record<JobState, string> = {
    queued: '◌',   // dotted circle: nothing has touched it
    running: '◐',  // half-filled circle: a thread is working on it
    stopped: '●',  // filled circle: started and released again
    finished: '✔', // check: finished_at is set
};

export function jobGlyph(state: JobState): string {
    return GLYPHS[state];
}

export function jobState(job: BackgroundJob): JobState {
    // finished_at wins: a finished job reads as done whatever its start/stop pair looks like.
    if (job.finished_at) return 'finished';
    if (job.started_at && !job.stopped_at) return 'running';
    if (job.started_at) return 'stopped';
    return 'queued';
}

function segments(path: string): string[] {
    return path ? path.split('.') : [];
}

/**
 * The shallowest in_section across the jobs: the section the task was started on. The task
 * title is not parsed for it, since that carries a book prefix and free-text suffix.
 */
export function taskRootPath(jobs: BackgroundJob[]): string {
    let root = '';
    let shortest = Infinity;
    for (const job of jobs) {
        const depth = segments(job.in_section).length;
        if (depth < shortest) {
            shortest = depth;
            root = job.in_section;
        }
    }
    return root;
}

/** Depth-first order: a parent before its children, numeric-aware within a level. */
function comparePaths(a: string, b: string): number {
    const left = segments(a);
    const right = segments(b);
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
        if (left[i] === right[i]) continue;
        return left[i].localeCompare(right[i], undefined, { numeric: true });
    }
    // One path is a prefix of the other, so it is the ancestor and comes first.
    return left.length - right.length;
}

/**
 * The task's jobs as a flat list in tree order, each annotated with how deep below the task
 * root it sits, the path fragment to show for it, and what its timestamps say about it.
 */
export function buildJobRows(jobs: BackgroundJob[]): JobRow[] {
    const root = taskRootPath(jobs);
    const rootSegments = segments(root);

    return [...jobs]
        .sort((a, b) => comparePaths(a.in_section, b.in_section))
        .map((job) => {
            const own = segments(job.in_section);
            const under = own.length > rootSegments.length
                && rootSegments.every((segment, i) => own[i] === segment);

            let depth = 0;
            let label = job.in_section;
            if (job.in_section === root) {
                label = ROOT_LABEL;
            } else if (under) {
                depth = own.length - rootSegments.length;
                label = own.slice(rootSegments.length).join('.');
            }
            // Anything else keeps its full path at depth 0: a job outside the root is not
            // expected, but it should still be readable rather than mislabelled.

            return { job, depth, label, state: jobState(job) };
        });
}
