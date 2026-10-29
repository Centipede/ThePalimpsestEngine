import type {ConversationRef, QuestionAnswerRef, StudyNoteRef} from './study';


export interface Topic {
    id: number;
    path: string;
    library_code: string | null;
    name: string;
    prose_description: string | null;
    parent: number | null;
    children: Topic[];
    facet_applications: FacetApplication[];
}

export interface Author {
    id: number;
    full_name: string;
    abbrev: string;
}

export interface Book {
    id: number;
    title: string;
    abbrev: string;
    language: string;
    published: string;
    machine_name: string;
    thumbnail_url?: string;
    thumbnail_local?: string;
    authors: unknown[];
    organizations: unknown[];
    physical_properties: Record<string, unknown>;
    by_author: number;
    by_author1: number | null;
    by_author2: number | null;
    by_author3: number | null;
    topics: number[];
    facet_applications: FacetApplication[];
    facet_applications_cascaded: FacetApplication[];
    question_answers?: QuestionAnswerRef[];
    conversations?: ConversationRef[];
    studynotes?: StudyNoteRef[];
}

export interface PageInfo {
    first_page: {
        id: number;
        page_name: string;
        page_number?: number;
    }
    first_content: {
        id: number;
    }
    last_page: {
        id: number;
        page_name: string;
        page_number?: number;
    }
    last_content: {
        id: number;
    }
}

export interface Section {
    id: number;
    path_id: string;
    path_full: string;
    path_coded?: string;
    title_text: string;
    order_key: number;
    level_type: unknown | null;
    subsections: Section[] | null;
    question_answers?: QuestionAnswerRef[];
    conversations?: ConversationRef[];
    studynotes?: StudyNoteRef[];
    pageinfo?: PageInfo | null;
    ancestors?: Section[] | null;
}

export interface Flow {
    name: string;
    properties: {
        name: string;
        section_default_names: string[];
        flow_section_structure: string[];
    };
    tree?: Section;
}

export interface BlockDigest {
    caption: string;
    theme: string;
    prose_summary: string | null;
    brief_summary: string | null;
    llm_summary: string | null;
}

export interface BlockEssentials {
    digest?: BlockDigest;
    outline?: any; // Future use
}

export interface BlockFindings {
    occurrences: FindingOccurrence[];
}

export interface ContentBlock {
    path_id: string;
    content_type: string;
    content_text: string;
    content_json: any;
    essentials?: BlockEssentials;
    findings?: BlockFindings;
    info?: {
        processing_manifest?: ProcessingManifest;
        emphases?: ContentEmphasis[];
    };
    pageinfo?: PageInfo | null;
    finding_occurrences?: FindingOccurrence[];
}

export interface ContentEmphasis {
    color: string;
    fragment: string;
}

// A descriptor for extraced_data in time facets (section_one data)
export interface CentralTimePeriod {
    interval_years: number[][];
    specific_years: number[];
    full_description: string;
    specific_full_dates: string[];
}

// A descriptor for extraced_data in place facets (section_one data)
export interface CentralGeographicalArea {
    placenames: string[];
    full_description: string;
}

export interface ParagraphSegment {
    ranges: string[];
    caption: string;
    description: string;
    keywords: string[];
}

export interface ParagraphSegments {
    paragraph_segments: ParagraphSegment[];
}

export interface PMLogEntry {
    when: string; // ISO datetime string
    notes: Record<string, any>;
    errors: string[];
}

export interface PMCompleted {
    facets: string[];
    essentials: string[];
}

export interface ProcessingManifest {
    completed: PMCompleted;
    log: PMLogEntry[];
}

export interface EssentialDigest {
    id: number;
    in_book_mn: string | null;
    in_section: number | null;
    in_section_pf: string | null;
    caption: string;
    theme: string;
    prose_summary: string | null;
    brief_summary: string | null;
    llm_summary: string | null;
}

export interface EssentialOutline {
    id: number;
    in_book_mn: string | null;
    in_section: number | null;
    in_section_pf: string | null;
    segments: ParagraphSegments | null;
}

export interface EssentialApplication {
    id: number;
    book: number | null;
    with_topics: number[];
    use_section_digest: boolean;
    use_section_outline: boolean;
}

export interface FacetApplication {
    id: number;
    facet: number | null;
    book: number | null;
    topic: number | null;
    use_section_one: boolean;
    use_section_few: boolean;
    use_section_many: boolean;
    use_segment_one: boolean;
    use_segment_few: boolean;
    use_segment_many: boolean;
    use_content_all: boolean;
    render_method: { method: 'time_period' | 'geographical_area' } | null;
}

export type ProvidedQueryData = 'full_text' | 'summary' | 'findings';

/**
 * Represents a site-wide facet of interest that the system can query for automatically.
 */
export interface FacetQuery {
    id: number;
    name: string;
    machine_name_singular: string;
    machine_name_plural: string;
    symbol: string;
    prose_description: string | null;
    query_block: Record<string, any> | null;
    query_section_one: Record<string, any> | null;
    query_section_few: Record<string, any> | null;
    query_section_many: Record<string, any> | null;
    query_data: ProvidedQueryData;
    schema_scratchpad: string | null;
    schema_section_one: Record<string, any> | null;
    schema_section_few: Record<string, any> | null;
    schema_section_many: Record<string, any> | null;
    // Stats included when ?stats=1 is used
    occurrences_count?: number;
    contexts_count?: number;
}

/**
 * Represents an identity found for a facet, typically linked to Wikidata/Wikipedia.
 */
export interface FoundIdentity {
    id: number;
    of_facet: number | FacetQuery | null;
    wikidata_qid: string;
    wikipedia_url: string | null;
    wikimedia_url: string | null;
    name: string;
    properties: Record<string, any> | null;
    articles: any[];
}

/**
 * Represents a specific mention of a finding in a content block.
 */
export interface FindingOccurrence {
    id: number;
    name: string;
    description: string;
    quote: string;
    in_block_pi: string;
    on_page: number | null;
    of_facet?: string;
    of_context: number | null;
    extracted_data: Record<string, any> | null;
}

/**
 * Represents a grouped finding within a section.
 */
export interface FindingContext {
    id: number;
    name: string;
    of_facet?: string;
    of_identity: FoundIdentity | null;
    occurrences: FindingOccurrence[];
}

export interface ActiveFindingContext {
    context: FindingContext;
    color: string;
}

/**
 * Grouped findings by facet (e.g., "people", "places").
 */
export type FindingContextMap = Record<string, FindingContext[]>;

export type FindingOccurrenceMap = Record<string, FindingOccurrence[]>;

export interface SectionFindings {
    contexts: FindingContextMap;
    section_one: FindingOccurrenceMap;
    section_few: FindingOccurrenceMap;
    section_many: FindingOccurrenceMap;
}

export interface SectionEssentials {
    digest?: EssentialDigest;
    outline?: EssentialOutline;
}

export interface SectionDetail extends Section {
    title_html: string;
    of_book: number;
    number_code: string;
    pure_title: string;
    content_hints: {
        category: string;
        ignore_in_search: boolean;
    };
    first_real_content: number;
    last_real_content: number;
    full_path_coded?: string;
    info?: {
        processing_manifest?: ProcessingManifest;
    };
    findings?: SectionFindings | null;
    essentials?: SectionEssentials | null;
}

export interface SegmentInfo {
    summary: Record<string, unknown>;
    queries: Record<string, unknown>;
    processing_manifest?: ProcessingManifest;
}

export interface CoverageSpec {
    paragraph_first?: number;
    paragraph_last?: number;
    character_first?: number;
    character_last?: number;
}

export interface Segment {
    id: number;
    path: string;
    order_key: string;
    path_id: string;
    in_section: number;
    coverage_spec: CoverageSpec;
    is_root: boolean;
    is_leaf: boolean;
    is_fractional: boolean;
    is_contiguous: boolean;
    info: SegmentInfo;
    subsegments: Segment[];
}

export interface SectionContentResponse {
    section: SectionDetail;
    contents: ContentBlock[];
    segments: Segment[];
}

export interface SectionInformationResponse {
    essentials: SectionEssentials | null;
    findings: SectionFindings;
}

export interface BookStructure {
    book: Book;
    flows: Flow[];
}

export interface Highlight {
    start: number;
    end: number;
    color: string;
    distance: number;
}

export interface TextSegment {
    start: number;
    end: number;
    highlights: Highlight[];
    mixedColor?: string;
}



export type SearchStyle = 'plain' | 'phrase' | 'raw' | 'websearch';

export interface SearchHit {
  in_book: number;
  by_author: number;
  in_section: {
    id: number;
    path_full: string;
    path_coded: string;
    title: string;
    ancestors?: Section[] | null;
  };
  in_block?: number;
  in_block_pi?: string;
  on_page: number;
  published: string | null;
  book_thumbnail_url: string | null;
  html_highlighted: string;
  rank: number;
}

export interface SearchResponse {
  hits: SearchHit[];
}

export interface SurroundingContentItem {
  index: number;
  content: ContentBlock | null;
}

export type SurroundingContentResponse = SurroundingContentItem[];
