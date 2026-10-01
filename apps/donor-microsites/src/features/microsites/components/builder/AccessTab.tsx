import { type FormEvent, useState } from 'react';

import { Button, Notice, useToast } from '@rfdtech/components';
import { Globe, KeyRound, Save, UsersRound } from 'lucide-react';

import type { Microsite, MicrositeAccess, MicrositeAccessInput } from '@partner-crm/types';
import { SectionCard, TextField, TextareaField } from '@partner-crm/ui';

import { type FieldErrors, parseStakeholderIds, validateAccess } from '@/features/microsites/domain';
import { fieldErrorsOf } from '@/features/microsites/errors';
import { ACCESS_DESCRIPTIONS, ACCESS_LABELS } from '@/features/microsites/labels';
import { useMicrosites } from '@/features/microsites/state/useMicrosites';

const ICONS: Record<MicrositeAccess, typeof Globe> = {
  PUBLIC: Globe,
  PASSWORD: KeyRound,
  NAMED_AUDIENCE: UsersRound,
};

const OPTIONS: MicrositeAccess[] = ['PUBLIC', 'PASSWORD', 'NAMED_AUDIENCE'];

export function AccessTab({ site, lockedReason }: { site: Microsite; lockedReason: string | null }) {
  const { setAccess, hasStoredCode } = useMicrosites();
  const { toast } = useToast();
  const storedCode = hasStoredCode(site);

  const [access, setAccessChoice] = useState<MicrositeAccess>(site.access);
  const [code, setCode] = useState('');
  const [idsText, setIdsText] = useState(site.audienceStakeholderIds.join('\n'));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const locked = lockedReason !== null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const input: MicrositeAccessInput = {
      access,
      audienceStakeholderIds: access === 'NAMED_AUDIENCE' ? parseStakeholderIds(idsText) : [],
      ...(access === 'PASSWORD' && code ? { accessCode: code } : {}),
    };
    const problems = validateAccess(input, { access: site.access, hasStoredCode: storedCode });
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setSaving(true);
    try {
      const saved = await setAccess(site.id, input);
      setCode('');
      toast({
        title: 'Access updated',
        description:
          saved.status === 'PUBLISHED'
            ? `${ACCESS_LABELS[saved.access]} — the live site changed immediately.`
            : `${ACCESS_LABELS[saved.access]} will apply when the site is published.`,
        variant: 'success',
      });
    } catch (reason) {
      setErrors(fieldErrorsOf(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate>
      <SectionCard
        title="Who can see this microsite"
        // description="Donor and Board reports can be restricted. Codes are stored hashed and never shown again."
        actions={
          <Button type="submit" size="sm" disabled={locked || saving} loading={saving}>
            <Save size={15} aria-hidden /> Save access
          </Button>
        }
      >
        <div className="space-y-5">
          {lockedReason ? (
            <Notice variant="warning" title="Access settings are read-only" leftBorder>
              {lockedReason}
            </Notice>
          ) : site.status === 'PUBLISHED' ? (
            <Notice variant="info" title="This microsite is live" leftBorder>
              Changes to access take effect immediately, and anyone who unlocked it before must unlock it again.
            </Notice>
          ) : null}

          <div role="radiogroup" aria-label="Access" className="grid gap-3 md:grid-cols-3">
            {OPTIONS.map((option) => {
              const Icon = ICONS[option];
              const active = access === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={locked}
                  onClick={() => {
                    setAccessChoice(option);
                    setErrors({});
                  }}
                  className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <Icon size={20} aria-hidden className="text-primary" />
                  <span className="text-sm font-semibold text-foreground">{ACCESS_LABELS[option]}</span>
                  <span className="text-xs leading-5 text-foreground-muted">{ACCESS_DESCRIPTIONS[option]}</span>
                </button>
              );
            })}
          </div>

          {access === 'PASSWORD' ? (
            <TextField
              label={storedCode && site.access === 'PASSWORD' ? 'New access code' : 'Access code'}
              type="password"
              autoComplete="new-password"
              required={!(storedCode && site.access === 'PASSWORD')}
              value={code}
              onChange={(value) => {
                setCode(value);
                setErrors({});
              }}
              // description={
                // storedCode && site.access === 'PASSWORD'
                  // ? 'A code is set. Leave empty to keep it, or enter a new one to replace it.'
                  // : `At least ${ACCESS_CODE_MIN} characters. Share it with the audience separately.`
              // }
              error={errors.accessCode}
              disabled={locked}
            />
          ) : null}

          {access === 'NAMED_AUDIENCE' ? (
            <TextareaField
              label="S081 stakeholder IDs"
              required
              rows={4}
              value={idsText}
              onChange={(value) => {
                setIdsText(value);
                setErrors({});
              }}
              placeholder="One stakeholder ID per line"
              // description="One per line (or separated by commas). Each invited contact receives a personal code."
              error={errors.audienceStakeholderIds}
              disabled={locked}
            />
          ) : null}
        </div>
      </SectionCard>
    </form>
  );
}
