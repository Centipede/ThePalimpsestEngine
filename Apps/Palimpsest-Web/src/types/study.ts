export type ConversationGoal = 'C' | 'ST' | 'TWB';


export interface BaseRef {
  id: number;
  is_pinned: boolean;
  order_key: number;
  title?: string;
  in_book: number | null;
  in_book_mn: string | null;
  on_page: number | null;
  in_section: number | null;
  in_section_pf: string | null;
  in_block: number | null;
  in_block_pi: string | null;
}

export interface SearchMetadataSection {
  id: number;
  path_full: string;
  title_text: string;
  full_path_coded: string;
}

export interface SearchMetadata {
  book_id: number;
  book_title: string;
  book_machine_name: string;
  sections: SearchMetadataSection[];
  page_ranges?: string;
  owner_section?: SearchMetadataSection;
}

export interface Conversation {
  id: number;
  owned_by: number | null;
  title: string | null;
  article: string;
  goal: ConversationGoal;
  system_prompt: string | null;
  model: string | null;
  conversation_history: Record<string, any>;
  metadata: SearchMetadata;
  created_at: string;
  updated_at: string;
  turns?: ConversationTurn[];
  references?: ConversationRef[];
}

export interface ConversationTurn {
  id: number;
  of_conversation: number;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationRef extends BaseRef {
  of_conversation: number;
}

export interface QuestionAnswer {
  id: number;
  of_studynote: number | null;
  owned_by: number | null;
  is_canned: boolean;
  title: string;
  question: string | null;
  answer: string | null;
  metadata?: SearchMetadata;
  references?: QuestionAnswerRef[];
}

export interface QuestionAnswerRef extends BaseRef {
  of_questionanswer: number;
}
