import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAnnotationsStore } from './annotations';
import { apiFetch } from '../api';

vi.mock('../api', () => ({
  apiFetch: vi.fn(),
}));

describe('Annotations Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initializes with empty annotationPurposes', () => {
    const store = useAnnotationsStore();
    expect(store.annotationPurposes).toEqual([]);
    expect(store.isLoadingPurposes).toBe(false);
    expect(store.error).toBe('');
  });

  it('fetches annotation purposes successfully', async () => {
    const mockPurposes = [
      { id: 1, name: 'Purpose 1', color: '#ff0000', order_key: 1, purpose: 'UH', tooltype: 'HCS' },
    ];
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockPurposes,
    });

    const store = useAnnotationsStore();
    await store.fetchAnnotationPurposes();

    expect(store.annotationPurposes).toEqual(mockPurposes);
    expect(store.isLoadingPurposes).toBe(false);
    expect(store.error).toBe('');
    expect(apiFetch).toHaveBeenCalledWith('/teststudy/api/v1/annotation/purpose');
  });

  it('does not fetch if data already exists and force is false', async () => {
    const store = useAnnotationsStore();
    store.annotationPurposes = [{ id: 1 } as any];
    
    await store.fetchAnnotationPurposes();
    
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('fetches if data exists but force is true', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    
    const store = useAnnotationsStore();
    store.annotationPurposes = [{ id: 1 } as any];
    
    await store.fetchAnnotationPurposes(true);
    
    expect(apiFetch).toHaveBeenCalled();
  });

  it('handles fetch error', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const store = useAnnotationsStore();
    await store.fetchAnnotationPurposes();

    expect(store.annotationPurposes).toEqual([]);
    expect(store.isLoadingPurposes).toBe(false);
    expect(store.error).toBe('HTTP 500');
  });

  it('getPurposeById returns correct purpose', () => {
    const store = useAnnotationsStore();
    store.annotationPurposes = [
      { id: 1, name: 'P1' } as any,
      { id: 2, name: 'P2' } as any,
    ];

    expect(store.getPurposeById(1)).toEqual({ id: 1, name: 'P1' });
    expect(store.getPurposeById(2)).toEqual({ id: 2, name: 'P2' });
    expect(store.getPurposeById(3)).toBeUndefined();
  });
});
