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

