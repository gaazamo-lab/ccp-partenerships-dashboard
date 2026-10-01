import { type FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button, Notice, useToast } from '@rfdtech/components';
import { UsersRound } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';

import { ROUTES } from '@/constants/routes';
import {
  EMPTY_CRITERIA,
  resolveSegmentMembers,
  segmentCounts,
  segmentCriteria,
} from '@/features/segments/resolution';
import {
  CheckboxField,
  FormActions,
  FormGrid,
  FormSection,
  MultiSelectField,
  TextField,
  TextareaField,
  formatCount,
} from '@/features/shared';
import { RELATIONSHIP_STATUSES, STAKEHOLDER_CATEGORIES } from '@/features/stakeholders/constants';
import { permissionHint } from '@/features/stakeholders/permissions';
import { useCrm } from '@/features/stakeholders/state/CrmContext';
import type {
  RelationshipStatus,
  Segment,
  SegmentCriteria,
  StakeholderCategory,
} from '@/features/stakeholders/types';

const CONSUMING_SYSTEMS = ['S075 Newsletter', 'S088 Consultations'];

interface SegmentFormValues {
  name: string;
  description: string;
  usedBy: string[];
  criteria: SegmentCriteria;
}

type SegmentErrors = Partial<Record<'name' | 'description' | 'usedBy', string>>;

function validate(form: SegmentFormValues, others: Segment[]): SegmentErrors {
  const errors: SegmentErrors = {};
  if (!form.name.trim()) errors.name = 'Name is required.';
  else if (
    others.some((item) => item.name.trim().toLowerCase() === form.name.trim().toLowerCase())
  ) {
    errors.name = 'Another segment already uses this name.';
  }
  if (!form.description.trim()) errors.description = 'Description is required.';
  if (form.usedBy.length === 0) errors.usedBy = 'Select at least one consuming system.';
  return errors;
}

/**
 * The audience segment form, used by the create and edit pages. The live
 * preview uses the same resolver as the segment card, so what the user sees
 * here is exactly what S075 / S088 would receive right now.
 */
export function SegmentForm({
  segment,
}: {
  /** Present in edit mode. */
  segment?: Segment;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stakeholders, segments, addSegment, updateSegment } = useCrm();
  const { toast } = useToast();
  const [form, setForm] = useState<SegmentFormValues>(() =>
    segment
      ? {
          name: segment.name,
          description: segment.description,
          usedBy: segment.usedBy,
          criteria: segmentCriteria(segment),
        }
      : { name: '', description: '', usedBy: ['S075 Newsletter'], criteria: EMPTY_CRITERIA },
  );
  const [errors, setErrors] = useState<SegmentErrors>({});
  const editing = Boolean(segment);
  const manageHint = permissionHint(user?.role, 'manage_segments');

  const owners = useMemo(
    () => [...new Set(stakeholders.map((item) => item.owner))].sort(),
    [stakeholders],
  );
  const preview = useMemo(
    () => segmentCounts(resolveSegmentMembers(form.criteria, stakeholders)),
    [form.criteria, stakeholders],
  );

  const setField = <K extends keyof SegmentFormValues>(field: K, value: SegmentFormValues[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => (field in current ? { ...current, [field]: undefined } : current));
  };
  const setCriteria = <K extends keyof SegmentCriteria>(field: K, value: SegmentCriteria[K]) =>
    setForm((current) => ({ ...current, criteria: { ...current.criteria, [field]: value } }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (manageHint) return;
    const found = validate(
      form,
      segments.filter((item) => item.id !== segment?.id),
    );
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    const input = {
      name: form.name.trim(),
      description: form.description.trim(),
      usedBy: form.usedBy,
      categories: form.criteria.categories,
      criteria: form.criteria,
    };
    const result = segment ? updateSegment(segment.id, input) : addSegment(input);
    if (!result.ok) {
      toast({ title: 'Segment not saved', description: result.message, variant: 'error' });
      return;
    }
    toast({
      title: editing ? 'Segment updated' : 'Live segment created',
      description: `${formatCount(preview.members)} contact${preview.members === 1 ? '' : 's'} currently match. Membership is re-resolved every time it is used.`,
      variant: 'success',
    });
    void navigate(ROUTES.SEGMENTS);
  };

  return (
    <form onSubmit={handleSubmit} className="flex  flex-col gap-body" noValidate>
      {manageHint ? (
        <Notice variant="warning" title="Read-only access" leftBorder>
          {manageHint} Ask a CRM administrator to {editing ? 'change' : 'create'} this segment.
        </Notice>
      ) : null}

      <FormSection
        title="Segment details"
        // description="Name the audience and choose which systems can use it."
      >
        <TextField
          label="Segment name"
          required
          autoFocus
          value={form.name}
          onChange={(value) => setField('name', value)}
          placeholder="e.g. Development partners — newsletter"
          error={errors.name}
        />
        <TextareaField
          label="Description"
          required
          rows={4}
          value={form.description}
          onChange={(value) => setField('description', value)}
          placeholder="Who is this audience, and what is it used for?"
          error={errors.description}
        />
        <MultiSelectField
          label="Available to"
          required
          value={form.usedBy}
          onChange={(value) => setField('usedBy', value)}
          options={CONSUMING_SYSTEMS}
          placeholder="Select consuming systems"
          // description="These systems resolve the segment by reference at send time."
          error={errors.usedBy}
        />
      </FormSection>

      <FormSection
        title="Membership rules"
        // description='Leave a list empty to mean "any". Inactive organisations and contacts, contacts held by S203, and contacts who withdrew consent are always excluded.'
      >
        <FormGrid>
          <MultiSelectField
            label="Stakeholder categories"
            optional
            value={form.criteria.categories}
            onChange={(value) => setCriteria('categories', value as StakeholderCategory[])}
            options={STAKEHOLDER_CATEGORIES}
            placeholder="All categories"
            searchPlaceholder="Search categories"
          />
          <MultiSelectField
            label="Relationship status"
            optional
            value={form.criteria.statuses}
            onChange={(value) => setCriteria('statuses', value as RelationshipStatus[])}
            options={RELATIONSHIP_STATUSES.filter((status) => status !== 'Inactive')}
            placeholder="Any active status"
          />
          <MultiSelectField
            className="sm:col-span-2"
            label="Relationship owners"
            optional
            value={form.criteria.owners}
            onChange={(value) => setCriteria('owners', value)}
            options={owners}
            placeholder="Any owner"
            searchPlaceholder="Search owners"
          />
        </FormGrid>
        <CheckboxField
          label="Consented contacts only"
          checked={form.criteria.consentedOnly}
          onChange={(checked) => setCriteria('consentedOnly', checked)}
          // description="Required for marketing sends through S075."
        />
        <Notice
          variant={preview.members === 0 ? 'warning' : 'info'}
          title={`${formatCount(preview.members)} contacts at ${formatCount(preview.organisations)} organisations match right now`}
          leftBorder
        >
          {formatCount(preview.consented)} have recorded consent. S075 and S088 resolve this
          segment again at send time; contact records are never copied.
        </Notice>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => void navigate(ROUTES.SEGMENTS)}>
          Cancel
        </Button>
        <Button type="submit" disabled={Boolean(manageHint)} title={manageHint}>
          <UsersRound size={16} aria-hidden /> {editing ? 'Save segment' : 'Create segment'}
        </Button>
      </FormActions>
    </form>
  );
}
