import { ref, type Ref } from 'vue';
import type { Conversation, ConversationRef, QuestionAnswer, QuestionAnswerRef } from '../types/study';
import { apiFetch } from '../api';

export interface WorkspaceState {
  loading: Ref<boolean>;
  error: Ref<string | null>;
  data: Ref<Conversation | QuestionAnswer | null>;
  type: Ref<'conversation' | 'question_answer' | null>;
  linkingRef: Ref<ConversationRef | QuestionAnswerRef | null>;
  loadItem: (type: 'conversation' | 'question_answer', id: number, refId?: number) => Promise<void>;
}

export function useStudyWorkspaceItem(): WorkspaceState {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const data = ref<Conversation | QuestionAnswer | null>(null);
  const type = ref<'conversation' | 'question_answer' | null>(null);
  const linkingRef = ref<ConversationRef | QuestionAnswerRef | null>(null);

  async function loadItem(itemType: 'conversation' | 'question_answer', id: number, refId?: number) {
    loading.value = true;
    error.value = null;
    type.value = itemType;

    try {
      const endpoint = itemType === 'conversation' 
        ? `/teststudy/api/v1/conversation/${id}/`
        : `/teststudy/api/v1/question-answer/${id}/`;
      
      const response = await apiFetch(endpoint);
      if (response.ok) {
        const result = await response.json();
        data.value = result;

        // If a refId was provided, try to find it in the data
        if (refId && result.references) {
          const foundRef = result.references.find((r: any) => r.id === refId);
          if (foundRef) {
            linkingRef.value = foundRef;
          }
        }
        
        // Fallback to first reference if linkingRef is still null
        if (!linkingRef.value && result.references?.length > 0) {
          linkingRef.value = result.references[0];
        }
      } else {
        error.value = `Error: ${response.statusText}`;
      }
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    data,
    type,
    linkingRef,
    loadItem
  };
}
