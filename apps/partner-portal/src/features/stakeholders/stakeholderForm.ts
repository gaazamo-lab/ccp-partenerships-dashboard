import { detectIndividualRecord } from '@/features/stakeholders/boundary';
import type { Stakeholder, StakeholderInput } from '@/features/stakeholders/types';

export { STAKEHOLDER_CATEGORIES } from '@/features/stakeholders/constants';

export const EMPTY_STAKEHOLDER: StakeholderInput = {
  name: '',
  shortName: '',
  category: 'Professional body',
  owner: '',
  location: '',
  website: '',
  description: '',
  health: 'Healthy',
  pipelineStage: 'Prospect',
};

export type StakeholderErrors = Partial<Record<keyof StakeholderInput, string>>;

export function stakeholderToInput(stakeholder: Stakeholder): StakeholderInput {
  return {
    name: stakeholder.name,
    shortName: stakeholder.shortName,
    category: stakeholder.category,
    owner: stakeholder.owner,
    location: stakeholder.location,
    website: stakeholder.website,
    description: stakeholder.description,
    health: stakeholder.health,
    pipelineStage: stakeholder.pipelineStage,
  };
}

/**
 * The fields the S081 register cannot accept a record without, plus the A-02
 * boundary guard. Both the create page and the edit modal validate through
 * here, so a rule added in one place can't go missing from the other.
 */
export function validateStakeholder(form: StakeholderInput): StakeholderErrors {
  const errors: StakeholderErrors = {};
  if (!form.name.trim()) errors.name = 'Organisation name is required.';
  if (!form.owner.trim()) errors.owner = 'Relationship owner is required.';
  if (!form.location.trim()) errors.location = 'Location is required.';
  const boundary = form.name.trim() ? detectIndividualRecord(form) : null;
  if (boundary && !errors[boundary.field]) errors[boundary.field] = boundary.message;
  return errors;
}
