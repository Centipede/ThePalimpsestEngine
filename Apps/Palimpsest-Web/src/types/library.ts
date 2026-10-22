import type {ConversationRef, QuestionAnswerRef, StudyNoteRef} from './study';


export interface Topic {
    id: number;
    path: string;
    library_code: string | null;
    name: string;
    prose_description: string | null;
    parent: number | null;
    children: Topic[];
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

export interface ContentBlock {
    path_id: string;
    content_type: string;
    content_text: string;
    content_json: any;
    inforecords: InfoRecord[];
    pageinfo?: PageInfo | null;
    finding_occurrences?: FindingOccurrence[];
}

export interface InfoRecord {
    id: number;
    of_content_pi: string;
    in_section_pf: string;
    in_book_mn: string;
    kind: 'summary' | 'named_entities' | 'emphasis' | string;
    source: string;
    created_at: string;
    created_info: any;
    content_js: ContentSummary | ContentEntities | ContentEmphasis | any;
    valid: boolean;
    validated_at: string | null;
    version_info: Record<string, any>;
    of_content: number;
}

export interface ContentSummary {
    caption: string;
    summary: string;
}

export interface ContentEmphasis {
    color: string;
    fragment: string;
}

export interface EntityInfo {
    name: string;
    quote: string;
    location: string;
    description: string;
}

export interface ContentEntities {
    entities: {
        times: EntityInfo[];
        works: EntityInfo[];
        people: EntityInfo[];
        places: EntityInfo[];
        fuzzy_answer: string;
    };
}

export interface SectionSummary {
    theme: string;
    key_events: string[];
    key_people: string[];
    brief_summary: string;
    prose_summary: string;
    key_institutions: string[];
    paragraph_segments: Array<{
        ranges: string[];
        caption: string;
        description?: string;
        keywords: string[];
    }>;
    central_time_period: {
        interval_years: number[][];
        specific_years: number[];
        full_description: string;
        specific_full_dates: string[];
    };
    central_geographical_area: {
        placenames: string[];
        full_description: string;
    };
}

export interface SectionEntities {
    linked: Record<string, any>;
    unlinked: Record<string, any>;
    unlinkable: Record<string, any>;
    linked_count: number;
    unlinked_count: number;
    unlinkable_count: number;
}

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
    query_block_lang: Record<string, string> | null;
    query_section_lang: Record<string, string> | null;
    extraction_schema: Record<string, any> | null;
    by_books: number[];
    by_topics: number[];
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
    wikimedia_commons_url: string | null;
    name: string;
    properties: Record<string, any> | null;
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
export type FindingFacetMap = Record<string, FindingContext[]>;

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
        summary?: SectionSummary;
        entities?: SectionEntities;
        facets?: FindingFacetMap;
    };
}

export interface SegmentInfo {
    summary: Record<string, unknown>;
    queries: Record<string, unknown>;
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

export interface BookStructure {
    book: Book;
    flows: Flow[];
}

export interface FoldTrigger {
    command: 'expand-all' | 'collapse-all';
    count: number;
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

export interface ToolbarToggle {
    name: string;
    type: string;
    checked: boolean;
}

export interface SectionSummaryNew {
    theme: string;
    brief_summary: string;
    tag_descriptors: {
        people: { title: string }[];
        events: { title: string }[];
        institutions: { title: string }[];
    };
    prose_descriptors: {
        time: SectionSummary['central_time_period'];
        place: SectionSummary['central_geographical_area'];
    };
    summary?: string;
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
