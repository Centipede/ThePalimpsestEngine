import type { Book, FacetQuery } from '../types/library';

/**
 * The facets applied to a book, for display alongside its topics.
 *
 * Reads `facet_applications_cascaded`, which is the book's own applications plus
 * everything inherited through its topics — so a book with no applications of its
 * own still shows what its topic asks of it.
 *
 * Note that useFacetExpectations() performs a similar join but additionally ORs
 * the `use_section_one/few/many` and `use_content_all` flags, and drops any facet
 * that expects nothing at section level. That is right for checking a processing
 * manifest and wrong here, where every applied facet is worth showing; hence the
 * deliberate parallel rather than a shared helper.
 */
export function facetsForBook(
  book: Book,
  getFacetById: (id: number) => FacetQuery | undefined
): FacetQuery[] {
  const byId = new Map<number, FacetQuery>();

  for (const application of book.facet_applications_cascaded ?? []) {
    if (application.disable) continue;
    if (application.facet === null) continue;
    if (byId.has(application.facet)) continue;

    // Absent while the facet queries are still in flight: skip rather than
    // render a placeholder chip that would shift the row a moment later.
    const facet = getFacetById(application.facet);
    if (!facet) continue;

    byId.set(application.facet, facet);
  }

  return [...byId.values()].sort((a, b) => a.id - b.id);
}
