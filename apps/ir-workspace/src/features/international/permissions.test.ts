import { describe, expect, it } from 'vitest';

import { canIr } from './permissions';

describe('S083 permissions', () => {
  it('gives administrators everything', () => {
    expect(canIr('CRM Administrator', 'engagement.approve')).toBe(true);
    expect(canIr('System Administrator', 'template.manage')).toBe(true);
  });

  it('separates officer, correspondence and approver duties', () => {
    expect(canIr('IR Officer', 'engagement.edit')).toBe(true);
    expect(canIr('IR Officer', 'engagement.approve')).toBe(false);
    expect(canIr('IR Officer', 'correspondence.manage')).toBe(false);
    expect(canIr('Correspondence Officer', 'template.manage')).toBe(true);
    expect(canIr('Correspondence Officer', 'gift.manage')).toBe(false);
    expect(canIr('IR Approver', 'correspondence.approve')).toBe(true);
    expect(canIr('IR Approver', 'engagement.edit')).toBe(false);
  });

  it('keeps viewers and auditors read/export only', () => {
    for (const role of ['Executive Viewer', 'Auditor']) {
      expect(canIr(role, 'export')).toBe(true);
      expect(canIr(role, 'engagement.edit')).toBe(false);
      expect(canIr(role, 'gift.manage')).toBe(false);
    }
    expect(canIr(undefined, 'export')).toBe(false);
    expect(canIr('Registrar', 'export')).toBe(false);
  });
});
