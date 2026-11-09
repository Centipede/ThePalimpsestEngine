import type { Component } from 'vue';
import TimeDescriptor from '../components/descriptors/TimeDescriptor.vue';
import PlaceDescriptor from '../components/descriptors/PlaceDescriptor.vue';
import NameRoleTextDescriptor from '../components/descriptors/NameRoleTextDescriptor.vue';

/**
 * Maps a facet's render method to the descriptor component that renders its
 * `extracted_data`, and to the prop name that component expects.
 *
 * Adding a render method is a new descriptor file plus one line here. Keep the
 * keys in sync with `FacetApplication.render_method.method` in types/library.ts
 * (and with the select in admin/FacetAssociationManager.vue for the methods that
 * should be user-selectable).
 */
const DESCRIPTOR_REGISTRY: Record<string, { component: Component; prop: string }> = {
  time_period: { component: TimeDescriptor, prop: 'central_time_period' },
  geographical_area: { component: PlaceDescriptor, prop: 'central_geographical_area' },
  name_role_text: { component: NameRoleTextDescriptor, prop: 'name_role_text' },
};

export interface ResolvedDescriptor {
  component: Component;
  props: Record<string, unknown>;
}

/**
 * Resolves a render method plus an occurrence's `extracted_data` into something
 * renderable with `<component :is>`. Returns null when the method is absent or
 * unknown, or when there is no data to render.
 */
export function resolveDescriptor(
  method: string | undefined | null,
  extractedData: Record<string, any> | null | undefined
): ResolvedDescriptor | null {
  if (!method || !extractedData) return null;

  const entry = DESCRIPTOR_REGISTRY[method];
  if (!entry) return null;

  return {
    component: entry.component,
    props: { [entry.prop]: extractedData },
  };
}

/**
 * True when extracted_data carries something worth opening a card for. Used to
 * decide whether a section_few pill is clickable at all, so an empty card can
 * never be opened.
 */
export function hasNameRoleText(data: Record<string, any> | null | undefined): boolean {
  if (!data) return false;
  return !!(
    (typeof data.role === 'string' && data.role.trim()) ||
    (typeof data.full_description === 'string' && data.full_description.trim())
  );
}
