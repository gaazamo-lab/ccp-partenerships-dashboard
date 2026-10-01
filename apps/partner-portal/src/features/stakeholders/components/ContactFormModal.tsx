import { type FormEvent, useState } from 'react';

import {
  Button,
  Field,
  FieldControl,
  FieldDescription,
  FieldLabel,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Notice,
  Radio,
  RadioGroup,
  useToast,
} from '@rfdtech/components';

import { FormGrid, SelectField, TextField } from '@/features/shared';
import { validateConsent } from '@/features/stakeholders/consent';
import { CONSENT_CHANNELS, CONSENT_STATUSES } from '@/features/stakeholders/constants';
import { todayIso } from '@/features/stakeholders/engagements';
import { useCrm } from '@/features/stakeholders/state/CrmContext';
import {
  type ConsentChannel,
  type ContactInput,
  REGULATED_CATEGORIES,
  type Stakeholder,
  type StakeholderContact,
} from '@/features/stakeholders/types';

type ContactErrors = Partial<Record<'name' | 'email' | 'consentDate' | 'consentChannel', string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: ContactInput): ContactErrors {
  const errors: ContactErrors = {};
  if (!form.name.trim()) errors.name = 'Name is required.';
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  return {
    ...errors,
    ...validateConsent(
      {
        consent: form.consent,
        consentDate: form.consentDate ?? null,
        consentChannel: form.consentChannel ?? null,
      },
      todayIso(),
    ),
  };
}

function initialForm(stakeholder: Stakeholder, contact?: StakeholderContact): ContactInput {
  if (contact) {
    return {
      name: contact.name,
      role: contact.role,
      email: contact.email,
      phone: contact.phone,
      consent: contact.consent,
      consentDate: contact.consentDate,
      consentChannel: contact.consentChannel,
      regulated: contact.screening !== 'Not required',
    };
  }
  return {
    name: '',
    role: '',
    email: '',
    phone: '',
    consent: 'Not recorded',
    consentDate: null,
    consentChannel: null,
    // S081-B-01: contacts of donors, embassies and international bodies are
    // screened by default. The officer can still flag any other contact.
    regulated: REGULATED_CATEGORIES.includes(stakeholder.category),
  };
}

export function ContactFormModal({
  open,
  onOpenChange,
  stakeholder,
  contact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stakeholder: Stakeholder;
  /** Present in edit mode. */
  contact?: StakeholderContact;
}) {
  const { addContact, updateContact } = useCrm();
  const { toast } = useToast();
  const [form, setForm] = useState<ContactInput>(() => initialForm(stakeholder, contact));
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<ContactErrors>({});
  const editing = Boolean(contact);
  // Once S203 has been asked, it cannot be un-asked from here.
  const screeningLocked = Boolean(contact && contact.screening !== 'Not required');
  const categoryRegulated = REGULATED_CATEGORIES.includes(stakeholder.category);
  const recordsConsent = form.consent === 'Consented' || form.consent === 'Withdrawn';

  const setField = <K extends keyof ContactInput>(field: K, value: ContactInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
    setErrors((current) => (field in current ? { ...current, [field]: undefined } : current));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    const input: ContactInput = recordsConsent
      ? form
      : { ...form, consentDate: null, consentChannel: null };
    const result = contact ? updateContact(contact.id, input) : addContact(stakeholder.id, input);
    if (!result.ok) {
      setError(result.message ?? 'The contact could not be saved.');
      return;
    }
    const startsScreening = form.regulated && (!contact || contact.screening === 'Not required');
    toast({
      title: editing ? 'Contact updated' : 'Contact added',
      description: startsScreening
        ? 'S203 screening has been requested and engagement is blocked pending clearance.'
        : editing
          ? `${form.name}'s details are up to date.`
          : 'The contact is now linked to this stakeholder.',
      variant: startsScreening ? 'warning' : 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <form onSubmit={handleSubmit} noValidate>
          <ModalHeader>
            <ModalTitle>{editing ? 'Edit contact' : 'Add key contact'}</ModalTitle>
            <ModalDescription>
              {editing
                ? `Update ${contact?.name} at ${stakeholder.name}.`
                : `Add a person CLET deals with at ${stakeholder.name}, with consent and screening controls.`}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-5">
            {error ? (
              <Notice variant="error" title="Possible duplicate contact" leftBorder>
                {error}
              </Notice>
            ) : null}

            <FormGrid>
              <TextField
                label="Full name"
                required
                autoFocus
                value={form.name}
                onChange={(value) => setField('name', value)}
                error={errors.name}
              />
              <TextField
                label="Role"
                value={form.role}
                onChange={(value) => setField('role', value)}
                placeholder="e.g. Director of Programmes"
              />
              <TextField
                label="Email"
                type="email"
                required
                value={form.email}
                onChange={(value) => setField('email', value)}
                error={errors.email}
                // description="Checked against every contact on the register."
              />
              <TextField
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={(value) => setField('phone', value)}
              />
              <SelectField
                label="Consent status"
                value={form.consent}
                onChange={(value) => setField('consent', value as ContactInput['consent'])}
                options={CONSENT_STATUSES}
                // description="S188 consent governs newsletter and consultation outreach."
              />
              {recordsConsent ? (
                <TextField
                  label={form.consent === 'Withdrawn' ? 'Withdrawn on' : 'Consent date'}
                  type="date"
                  required
                  max={todayIso()}
                  value={form.consentDate ?? ''}
                  onChange={(value) => setField('consentDate', value || null)}
                  error={errors.consentDate}
                />
              ) : null}
              {recordsConsent ? (
                <SelectField
                  label="Channel"
                  required
                  value={form.consentChannel ?? ''}
                  onChange={(value) => setField('consentChannel', (value || null) as ConsentChannel | null)}
                  options={CONSENT_CHANNELS}
                  placeholder="How it was received"
                  error={errors.consentChannel}
                />
              ) : null}
            </FormGrid>

            <Field>
              <FieldLabel>Regulatory screening</FieldLabel>
              <FieldControl>
                <RadioGroup
                  value={form.regulated ? 'regulated' : 'standard'}
                  onValueChange={(value) => setField('regulated', value === 'regulated')}
                  variant="card"
                >
                  <Radio
                    value="standard"
                    label="Standard contact"
                    // description="No S203 screening required"
                    disabled={screeningLocked}
                  />
                  <Radio
                    value="regulated"
                    label="Regulated contact"
                    // description="Donor, international partner, or other due-diligence category"
                  />
                </RadioGroup>
              </FieldControl>
              <FieldDescription>
                {screeningLocked
                  ? `S203 screening is ${contact?.screening.toLowerCase()} for this contact and cannot be removed here.`
                  : categoryRegulated
                    ? `${stakeholder.category} is a regulated category, so screening is on by default.`
                    : 'Turn screening on for any contact that needs due diligence.'}
              </FieldDescription>
            </Field>

            {form.regulated && !screeningLocked ? (
              <Notice variant="warning" title="Engagement will be blocked" leftBorder>
                S203 sanctions, PEP, and watchlist screening must clear before {stakeholder.name}{' '}
                can be engaged.
              </Notice>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Save contact' : 'Add contact'}</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
