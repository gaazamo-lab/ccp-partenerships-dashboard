import type { Stakeholder, StakeholderContact } from '@/features/stakeholders/types';

export function makeContact(overrides: Partial<StakeholderContact> = {}): StakeholderContact {
  return {
    id: 'con-1',
    name: 'Ama Owusu',
    role: 'Executive Secretary',
    email: 'ama@ghanabar.org',
    phone: '+233 20 555 0142',
    consent: 'Consented',
    consentDate: '2026-03-14',
    consentChannel: 'Form',
    screening: 'Not required',
    screeningRecord: null,
    active: true,
    ...overrides,
  };
}

export function makeStakeholder(overrides: Partial<Stakeholder> = {}): Stakeholder {
  return {
    id: 'stk-1',
    name: 'Ghana Bar Association',
    shortName: 'GBA',
    category: 'Professional body',
    owner: 'Nana Asante',
    status: 'Active',
    health: 'Healthy',
    pipelineStage: 'Engaged',
    lastEngagement: '2026-09-12',
    location: 'Accra, Ghana',
    website: 'ghanabar.org',
    description: '',
    contacts: [],
    engagements: [],
    ...overrides,
  };
}
