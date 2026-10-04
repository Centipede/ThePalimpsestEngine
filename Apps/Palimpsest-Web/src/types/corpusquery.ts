export type OperatorKind =
    | 'sequence'
    | 'union'
    | 'intersection'
    | 'conversion'
    | 'picking'
    | 'search_postgres_fts'
    | 'search_fuzzy_search'
    | 'search_semantic_vector';
export type ObjectKind =
    | 'author'
    | 'book'
    | 'section'
    | 'qa'
    | 'conversation'
    | 'entity';
export type PickStrategy = 'include' | 'exclude';
export type PickExpansion = 'self' | 'children' | 'descendants';
export type PickProperties =
    | 'section_representation_v1'
    | 'section_summaries_v1'
    | 'section_entities_v1'
    | 'contents'
    | 'contents_summaries_v1'
    | 'contents_entities_v1';

export interface PickedAuthor {
    obj_kind: 'author';
    id: number;
    abbrev: string;
}

export interface PickedBook {
    obj_kind: 'book';
    id: number;
    abbrev: string;
    machine_name: string;
    author_abbrev?: string | null;
}

export interface PickedSection {
    obj_kind: 'section';
    id: number;
    path_full: string;
    path_coded: string;
    book_abbrev?: string | null;
    author_abbrev?: string | null;
}

export type PickedObject = PickedAuthor | PickedBook | PickedSection;

export interface PickingStep {
    strategy: PickStrategy;
    expansion: PickExpansion;
    properties: PickProperties;
    selection: PickedObject[];
}

export interface PickingOperator {
    op_kind: 'picking';
    steps: PickingStep[];
}

export interface SearchOperatorBase {
    input_types: ObjectKind[];
    output_type: ObjectKind;
    num_results?: number | null;
    incl_n_before?: number | null;
    incl_n_after?: number | null;
}

export interface SearchPostgresFTS extends SearchOperatorBase {
    op_kind: 'search_postgres_fts';
    fts_style?: 'plain' | 'phrase' | 'raw' | 'websearch';
    query: string;
}

export interface SearchFuzzySearch extends SearchOperatorBase {
    op_kind: 'search_fuzzy_search';
    query: string;
    within_levenshtein_dist?: number;
}

export interface SearchSemanticVector extends SearchOperatorBase {
    op_kind: 'search_semantic_vector';
    query: string;
    embedding_model?: 'openai_embed' | null;
}

export interface SequenceOperator {
    op_kind: 'sequence';
    operators: OperatorNode[];
}

export interface UnionOperator {
    op_kind: 'union';
    operators: OperatorNode[];
}

export interface IntersectionOperator {
    op_kind: 'intersection';
    operators: OperatorNode[];
}

export type OperatorNode =
    | SequenceOperator
    | UnionOperator
    | PickingOperator
    | IntersectionOperator
    | SearchPostgresFTS
    | SearchFuzzySearch
    | SearchSemanticVector;