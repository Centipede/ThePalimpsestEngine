/** The admin tools offered in the staff menu and the Administration sidebar. */
export interface AdminTool {
  /** sl-menu-item value in the Administration sidebar. */
  key: string;
  label: string;
  /** Bootstrap Icons name (Shoelace's default icon library). */
  icon: string;
  path: string;
}

/**
 * Single source of truth for the admin tools, so the NavBar menu and the
 * Administration sidebar cannot drift apart as tools are added.
 */
export const ADMIN_TOOLS: AdminTool[] = [
  {
    key: 'facets',
    label: 'Facets',
    icon: 'funnel',
    path: '/admin/facets',
  },
  {
    key: 'topic-assignments',
    label: 'Topic assignments',
    icon: 'ui-checks-grid',
    path: '/admin/topic-assignments',
  },
];
