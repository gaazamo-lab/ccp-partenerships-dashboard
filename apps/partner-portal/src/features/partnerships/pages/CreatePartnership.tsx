import { type FormEvent, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { Button, Notice, useToast } from '@rfdtech/components';
import { FilePlus2 } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import type { UpdatePartnershipInput } from '@partner-crm/types';

import { ROUTES, partnershipRoute } from '@/constants/routes';
import { AgreementFields } from '@/features/partnerships/components/AgreementFields';
import {
  type AgreementErrors,
  EMPTY_AGREEMENT,
  agreementPartyIds,
  isBlockedParty,
  parseDeliverables,
  validateAgreement,
} from '@/features/partnerships/partnershipForm';
import { canManagePartnership } from '@/features/partnerships/permissions';
import { usePartnerships } from '@/features/partnerships/state/usePartnerships';
import { FormActions, PageHeader } from '@/features/shared';
import { useCrm } from '@/features/stakeholders/state/CrmContext';

export function Component() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { stakeholders } = useCrm();
  const { createAgreement } = usePartnerships();
  const { toast } = useToast();

  const requestedStakeholderId = searchParams.get('stakeholderId') ?? '';
  const initialStakeholderId = stakeholders.some((item) => item.id === requestedStakeholderId)
    ? requestedStakeholderId
    : '';

  const [form, setForm] = useState<UpdatePartnershipInput>(() => ({
    ...EMPTY_AGREEMENT,
    stakeholderId: initialStakeholderId,
  }));
  const [deliverablesText, setDeliverablesText] = useState('');
  const [errors, setErrors] = useState<AgreementErrors>({});

  const canCreate = canManagePartnership(user?.role, 'create');

  const setField = <K extends keyof UpdatePartnershipInput>(
    field: K,
    value: UpdatePartnershipInput[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    // Clear the field's error as it's edited, rather than making the user
    // submit again to find out whether they've fixed it.
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  const selectedPartyIds = useMemo(() => agreementPartyIds(form), [form]);
  const deliverables = useMemo(() => parseDeliverables(deliverablesText), [deliverablesText]);

  const blockedParties = stakeholders.filter(
    (item) => selectedPartyIds.includes(item.id) && isBlockedParty(item),
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateAgreement(form, deliverables);
    setErrors(found);
    if (!canCreate || Object.keys(found).length > 0 || blockedParties.length > 0) return;

    const created = createAgreement({
      stakeholderId: form.stakeholderId,
      partyStakeholderIds: selectedPartyIds,
      title: form.title.trim(),
      agreementType: form.agreementType,
      owner: form.owner.trim(),
      effectiveDate: form.effectiveDate,
      expiryDate: form.expiryDate,
      valueCommitment: form.valueCommitment.trim(),
      deliverables,
      legalContractRef: form.legalContractRef?.trim() || null,
    });
    toast({
      title: 'Partnership record created',
      description: `${created.reference} is ready for drafting and legal review.`,
      variant: 'success',
    });
    void navigate(partnershipRoute(created.id));
  };

  if (!canCreate) {
    return (
      <section className="flex flex-col gap-body">
        <PageHeader
          title="Create MOU or partnership"
          backTo={{ to: ROUTES.PARTNERSHIPS, label: 'Back to partnerships' }}
        />
        <Notice variant="error" title="Creation is restricted" leftBorder>
          Your role cannot create S082 partnership records. Ask a partnerships manager to open the
          draft for you.
        </Notice>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Create MOU or partnership"
        // description="Open a lifecycle record against authoritative S081 stakeholders."
        backTo={{ to: ROUTES.PARTNERSHIPS, label: 'Back to partnerships' }}
        // meta={<Badge variant="outline">System S082</Badge>}
      />

      <form onSubmit={handleSubmit} className="flex max-w-4xl flex-col gap-body" noValidate>
        <Notice variant="info" title="System boundary" leftBorder>
          CLET is an implicit party. External organisations remain authoritative in S081; signed
          files remain in S003 and legal records in S136.
        </Notice>

        <AgreementFields
          layout="sections"
          form={form}
          onChange={setField}
          stakeholders={stakeholders}
          errors={errors}
          deliverablesText={deliverablesText}
          onDeliverablesTextChange={(value) => {
            setDeliverablesText(value);
            setErrors((current) =>
              current.deliverables ? { ...current, deliverables: undefined } : current,
            );
          }}
          deliverableCount={deliverables.length}
        />

        {blockedParties.length > 0 ? (
          <Notice variant="warning" title="Party cannot proceed" leftBorder>
            {blockedParties.map((item) => item.name).join(', ')} must clear S203 screening or be
            reactivated before this record can be saved.
          </Notice>
        ) : null}

        <FormActions>
          <Button type="button" variant="ghost" onClick={() => void navigate(ROUTES.PARTNERSHIPS)}>
            Cancel
          </Button>
          <Button type="submit" disabled={blockedParties.length > 0}>
            <FilePlus2 size={16} aria-hidden /> Create draft
          </Button>
        </FormActions>
      </form>
    </section>
  );
}
