import { post, postMaybeEmpty } from './http';
import type { GatherGroup, GatherOptions } from '../utils/gatherSuggestion';

/**
 * The two section maintenance calls: the destructive one and the one that starts the
 * gathering job. Nothing else in the app may hold one of these URLs: the backend lives
 * in a separate project, so when a route moves this file is the whole blast radius.
 *
 * Both are staff-gated, and both apply to the addressed section plus all of its
 * descendants - removing records on a book's first chapter heading reaches every
 * subsection under it.
 *
 * Each body names three levels: `section` (the section's own essentials and findings),
 * `contexts` (the groupings of its block findings, and nothing else) and `content` (the
 * block findings themselves). The mid level is what lets a grouping be dropped and
 * rebuilt without re-running the extraction that produced the findings - and removing a
 * `content` facet still takes its contexts with it, since findings with nothing left to
 * group cannot keep a grouping.
 */

const BOOK = '/testbooks/api/v1/book';

function sectionUrl(machineName: string, sectionPath: string, action: string): string {
  return `${BOOK}/${machineName}/section/${sectionPath}/maintenance/${action}`;
}

/** A level's records, named the way the manifest names them. */
export type GranularDeleteOptions = GatherGroup;

export interface DeleteContextsGroup {
  facets: string[];
  /**
   * Whether to remove the groupings a human has tied to a found identity.
   *
   * Off by default, and the server's default too: an identified context is human-made
   * work, and deleting it throws away that context's identity-candidate rows with it.
   * What was spared comes back as preserved_counts.
   */
  include_identified: boolean;
}

export interface DeleteOptions {
  section: GranularDeleteOptions;
  contexts: DeleteContextsGroup;
  content: GranularDeleteOptions;
}

/**
 * What a removal actually did.
 *
 * Both count maps are keyed by record kind and the set of keys is the backend's to
 * extend, so they are read as plain records rather than a fixed shape - see
 * utils/maintenanceOutcome.ts, which knows how to say any of them out loud.
 */
export interface RemoveRecordsResult {
  status?: string;
  deleted_counts?: Record<string, number>;
  /** Records a rule kept: `identified_contexts` is the one the server reports today. */
  preserved_counts?: Record<string, number>;
}

export function removeSectionRecords(args: {
  machineName: string;
  sectionPath: string;
  options: DeleteOptions;
}): Promise<RemoveRecordsResult> {
  return post<RemoveRecordsResult>(
    sectionUrl(args.machineName, args.sectionPath, 'remove_records'),
    args.options,
  );
}

/**
 * Starts the gathering job and returns once it is queued, not once it is done: the work
 * is a background task, which the info pane follows through active_background_task.
 *
 * The response body is of no use here and may be empty, so it is neither typed nor read
 * - a failure arrives as a thrown FindingActionError either way.
 */
export function startSectionGatherInfo(args: {
  machineName: string;
  sectionPath: string;
  options: GatherOptions;
}): Promise<unknown> {
  return postMaybeEmpty<unknown>(
    sectionUrl(args.machineName, args.sectionPath, 'job/start_gather_info'),
    args.options,
  );
}
