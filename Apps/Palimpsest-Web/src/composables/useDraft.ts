import { ref, watch, onMounted } from 'vue';

/**
 * A composable for managing persistent drafts in browser localStorage.
 * 
 * @param key The localStorage key to use.
 * @param initialValue The default value if no draft is found.
 */
export function useDraft(key: string | (() => string), initialValue: string = '') {
  const getKey = () => typeof key === 'function' ? key() : key;
  
  const draft = ref(localStorage.getItem(getKey()) || initialValue);

  // Watch for changes to the draft and save to localStorage
  watch(draft, (newValue) => {
    const currentKey = getKey();
    if (newValue) {
      localStorage.setItem(currentKey, newValue);
    } else {
      localStorage.removeItem(currentKey);
    }
  });

  // Also watch the key itself if it's a function (reactive)
  if (typeof key === 'function') {
    watch(key, (newKey, oldKey) => {
      // When key changes, load new value from storage
      draft.value = localStorage.getItem(newKey) || initialValue;
    });
  }

  const clear = () => {
    draft.value = '';
    localStorage.removeItem(getKey());
  };

  return { draft, clear };
}
