import { useState } from 'react';

import { Notice, useToast } from '@rfdtech/components';

import type { IrEngagement } from '@partner-crm/types';

import { isMaterialEngagementChange, engagementToInput } from '../domain';
import {
  type EngagementFormErrors,
  engagementValues,
  validateEngagementValues,
  valuesToInput,
} from '../engagementForm';
import { useIr } from '../state/useIr';
import { EngagementFields } from './EngagementFields';
import { FormModal } from './FormModal';

interface EngagementEditModalProps {
  engagement: IrEngagement;
  onOpenChange: (open: boolean) => void;
}

export function EngagementEditModal({ engagement, onOpenChange }: EngagementEditModalProps) {
  const { updateEngagement } = useIr();
  const { toast } = useToast();
  const [values, setValues] = useState(() => engagementValues(engagement));
  const [errors, setErrors] = useState<EngagementFormErrors>({});
  const approved = engagement.status === 'APPROVED' || engagement.status === 'SCHEDULED';
  const material = isMaterialEngagementChange(engagementToInput(engagement), valuesToInput(values));

  const submit = async () => {
    const nextErrors = validateEngagementValues(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return false;
    const saved = await updateEngagement(engagement.id, valuesToInput(values));
    if (!saved) return false;
    toast({
      title: 'Engagement updated',
      description:
        saved.status !== engagement.status
          ? `Saved as version ${saved.version}. The approval was invalidated and the plan resubmitted.`
          : `Saved as version ${saved.version}.`,
      variant: saved.status !== engagement.status ? 'warning' : 'success',
    });
    return true;
  };

  return (
    <FormModal
      title="Edit engagement"
      // description={`${engagement.reference} · version ${engagement.version}`}
      submitLabel="Save changes"
      size="xl"
      onSubmit={submit}
      onOpenChange={onOpenChange}
    >
      {approved && material ? (
        <Notice variant="warning" title="This change invalidates the approval" leftBorder>
          The plan was approved as version {engagement.version}. Saving a material change returns it to
          Submitted for a fresh approval.
        </Notice>
      ) : null}
      <EngagementFields values={values} errors={errors} onChange={setValues} />
    </FormModal>
  );
}
