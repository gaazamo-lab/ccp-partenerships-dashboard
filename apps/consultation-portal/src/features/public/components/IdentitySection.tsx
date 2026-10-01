import { Card } from '@rfdtech/components';
import { LockKeyhole } from 'lucide-react';

import type { Consultation } from '@partner-crm/types';
import { FormGrid, TextField } from '@partner-crm/ui';

import type { IdentityState, identityErrors } from '@/features/consultations/domain';

interface IdentitySectionProps {
  consultation: Consultation;
  identity: IdentityState;
  errors: ReturnType<typeof identityErrors>;
  onChange: (identity: IdentityState) => void;
}

/**
 * Identity capture. Optional (opt-in) when anonymous responses are allowed;
 * mandatory — details plus explicit consent to the link — when they are not.
 */
export function IdentitySection({ consultation, identity, errors, onChange }: IdentitySectionProps) {
  const required = !consultation.anonymousAllowed;
  const showFields = required || identity.consent;
  const setRespondent = (key: keyof IdentityState['respondent'], value: string) =>
    onChange({ ...identity, respondent: { ...identity.respondent, [key]: value } });

  return (
    <Card bordered>
      <div className="flex gap-3">
        <LockKeyhole className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden />
        <div>
          <h2 className="font-semibold">{required ? 'Your details (required)' : 'Optional identity link'}</h2>
          <p className="mt-1 text-sm leading-6 text-foreground-muted">
            {required
              ? 'This consultation is limited to identified respondents. Your details are stored with your answers only because you consent below, and you can withdraw consent by contacting CLET.'
              : 'Your response is anonymous by default. Tick the box only if you want CLET to link your contact details to your answers, for example to follow up.'}
          </p>
        </div>
      </div>
      <label className={`mt-5 flex cursor-pointer gap-3 rounded-lg border p-4 ${errors.consent ? 'border-error' : 'border-border'}`}>
        <input
          type="checkbox"
          checked={identity.consent}
          onChange={(event) => onChange({ ...identity, consent: event.target.checked })}
          className="mt-1 size-4 accent-primary"
          aria-invalid={Boolean(errors.consent)}
        />
        <span>
          <span className="block font-medium">I explicitly consent to linking my contact details to this response.</span>
          <span className="mt-1 block text-sm text-foreground-muted">Processed under Ghana's Data Protection Act, 2012 (Act 843).</span>
        </span>
      </label>
      {errors.consent ? <p className="mt-2 text-sm text-error" role="alert">{errors.consent}</p> : null}
      {showFields ? (
        <div className="mt-5">
          <FormGrid>
            <TextField label="Name" required autoComplete="name" value={identity.respondent.name} error={errors.name} onChange={(value) => setRespondent('name', value)} />
            <TextField label="Email" type="email" required autoComplete="email" value={identity.respondent.email} error={errors.email} onChange={(value) => setRespondent('email', value)} />
            <TextField label="Stakeholder group" value={identity.respondent.stakeholderGroup} placeholder="e.g. Student, Employer, Bar member" onChange={(value) => setRespondent('stakeholderGroup', value)} />
          </FormGrid>
        </div>
      ) : null}
    </Card>
  );
}
