export type ConversationGoal = 'C' | 'ST' | 'TWB';

export interface Conversation {
  id: number;
  owned_by: number | null;
  title: string | null;
  article: string;
  goal: ConversationGoal;
  system_prompt: string | null;
  model: string | null;
  conversation_history: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  turns?: ConversationTurn[];
}

export interface ConversationTurn {
  id: number;
  of_conversation: number;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
}

export interface BaseRef {
  id: number;
  is_pinned: boolean;
  order_key: number;
  in_book: number | null;
  in_book_mn: string | null;
  on_page: number | null;
  in_section: number | null;
  in_section_pf: string | null;
  in_block: number | null;
  in_block_pi: string | null;
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
}

export interface QuestionAnswerRef extends BaseRef {
  of_questionanswer: number;
}
