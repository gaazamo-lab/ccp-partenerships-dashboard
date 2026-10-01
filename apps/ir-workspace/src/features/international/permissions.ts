/**
 * S083 role matrix. Buttons for actions a role lacks stay visible but
 * disabled, so read-only users can see what exists without being able to act.
 */
export type IrPermission =
  | 'engagement.edit'
  | 'engagement.transition'
  | 'engagement.approve'
  | 'protocol.manage'
  | 'gift.manage'
  | 'correspondence.manage'
  | 'correspondence.approve'
  | 'template.manage'
  | 'export';

const ALL: IrPermission[] = [
  'engagement.edit',
  'engagement.transition',
  'engagement.approve',
  'protocol.manage',
  'gift.manage',
  'correspondence.manage',
  'correspondence.approve',
  'template.manage',
  'export',
];

const grants: Record<string, IrPermission[]> = {
  'System Administrator': ALL,
  'CRM Administrator': ALL,
  'IR Officer': ['engagement.edit', 'engagement.transition', 'protocol.manage', 'gift.manage', 'export'],
  'Correspondence Officer': ['correspondence.manage', 'template.manage', 'export'],
  'IR Approver': ['engagement.approve', 'correspondence.approve', 'export'],
  'Executive Viewer': ['export'],
  Auditor: ['export'],
};

export function canIr(role: string | null | undefined, permission: IrPermission): boolean {
  return role ? (grants[role] ?? []).includes(permission) : false;
}

export const DENIED_REASON: Record<IrPermission, string> = {
  'engagement.edit': 'Only IR Officers and administrators can edit engagements.',
  'engagement.transition': 'Only IR Officers and administrators can move an engagement forward.',
  'engagement.approve': 'Only IR Approvers can review, approve or return a plan.',
  'protocol.manage': 'Only IR Officers can change delegation, protocol, support and follow-ups.',
  'gift.manage': 'Only IR Officers can record gifts or retry S011 flags.',
  'correspondence.manage': 'Only Correspondence Officers can register or draft correspondence.',
  'correspondence.approve': 'Only IR Approvers can approve or return a letter.',
  'template.manage': 'Only Correspondence Officers can change letter templates.',
  export: 'Your role cannot export S083 records.',
};
