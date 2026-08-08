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
}

export interface Section {
    id: number;
    path_id: string;
    path_full: string;
    title_text: string;
    order_key: number;
    level_type: unknown | null;
    subsections: Section[] | null;
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
    inforecords: any[];
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
    unlinked: {
        times?: any[];
        works?: any[];
        people?: any[];
        places?: any[];
    };
    unlinkable: Record<string, any>;
    linked_count: number;
    unlinked_count: number;
    unlinkable_count: number;
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
    info?: {
        summary?: SectionSummary;
        entities?: SectionEntities;
    };
}

export interface SectionContentResponse {
    section: SectionDetail;
    contents: ContentBlock[];
}











