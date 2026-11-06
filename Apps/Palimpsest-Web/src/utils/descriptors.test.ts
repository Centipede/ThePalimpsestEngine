import { describe, it, expect } from 'vitest';
import { resolveDescriptor, hasNameRoleText } from './descriptors';
import TimeDescriptor from '../components/descriptors/TimeDescriptor.vue';
import PlaceDescriptor from '../components/descriptors/PlaceDescriptor.vue';
import NameRoleTextDescriptor from '../components/descriptors/NameRoleTextDescriptor.vue';

describe('resolveDescriptor', () => {
  it('maps time_period to TimeDescriptor with its prop name', () => {
    const data = { brief_description: 'The regency years', interval_years: [[1610, 1643]] };
    const resolved = resolveDescriptor('time_period', data);

    expect(resolved?.component).toBe(TimeDescriptor);
    expect(resolved?.props).toEqual({ central_time_period: data });
  });

  it('maps geographical_area to PlaceDescriptor with its prop name', () => {
    const data = { placenames: ['Pau'], brief_description: 'South-western France' };
    const resolved = resolveDescriptor('geographical_area', data);

    expect(resolved?.component).toBe(PlaceDescriptor);
    expect(resolved?.props).toEqual({ central_geographical_area: data });
  });

  it('maps name_role_text to NameRoleTextDescriptor with its prop name', () => {
    const data = { name: 'Ludvig XIII', role: 'historisk konge', full_description: 'En historisk konge…' };
    const resolved = resolveDescriptor('name_role_text', data);

    expect(resolved?.component).toBe(NameRoleTextDescriptor);
    expect(resolved?.props).toEqual({ name_role_text: data });
  });

  it('returns null for an unknown render method', () => {
    expect(resolveDescriptor('something_new', { name: 'x' })).toBeNull();
  });

  it('returns null when no render method is configured', () => {
    expect(resolveDescriptor(undefined, { name: 'x' })).toBeNull();
    expect(resolveDescriptor(null, { name: 'x' })).toBeNull();
  });

  it('returns null when there is no extracted data', () => {
    expect(resolveDescriptor('name_role_text', null)).toBeNull();
    expect(resolveDescriptor('name_role_text', undefined)).toBeNull();
  });
});

describe('hasNameRoleText', () => {
  it('is true when a role is present', () => {
    expect(hasNameRoleText({ name: 'Ludvig XIII', role: 'historisk konge', full_description: '' })).toBe(true);
  });

  it('is true when a full description is present', () => {
    expect(hasNameRoleText({ name: 'Ludvig XIII', role: '', full_description: 'En historisk konge…' })).toBe(true);
  });

  it('is false for a bare name, so no empty card can be opened', () => {
    expect(hasNameRoleText({ name: 'Ludvig XIII' })).toBe(false);
    expect(hasNameRoleText({ name: 'Ludvig XIII', role: '   ', full_description: '' })).toBe(false);
  });

  it('is false for missing or null extracted data', () => {
    expect(hasNameRoleText(null)).toBe(false);
    expect(hasNameRoleText(undefined)).toBe(false);
    expect(hasNameRoleText({})).toBe(false);
  });

  it('ignores non-string values', () => {
    expect(hasNameRoleText({ role: 42, full_description: {} } as any)).toBe(false);
  });
});
