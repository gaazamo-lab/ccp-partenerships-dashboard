import { type FormEvent, useEffect, useState } from 'react';

import { Badge, Button, Notice } from '@rfdtech/components';
import { Save, ShieldCheck } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { Panel } from '@/components/Panel';
import { useOperationalRole } from '@/features/access/role-context';
import { travelRepository } from '@/features/requests/data/repository';
import type { TravelPolicyInput } from '@/features/requests/types';

const KEY = 's084.preview.configuration';
const BANDS = ['Regional', 'Continental', 'International'] as const;
const TEMPLATES = ['S084 standard v3.1', 'S084 executive v2.0'];
const initial: TravelPolicyInput = {
  policyVersion: 'TRV-4.2',
  rateVersion: 'RATE-2026.1',
  currency: 'GHS',
  dailyRates: { Regional: 1200, Continental: 1800, International: 2400 },
  supportTemplate: 'S084 standard v3.1',
  authorisationTemplate: 'S084 standard v3.1',
  escalationDays: 3,
};
const inputClass =
  'w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2';

/** Mock-mode stand-in only: API mode reads and writes the versioned policy row. */
function readPreview(): TravelPolicyInput {
  try {
    const stored = sessionStorage.getItem(KEY);
    return stored ? { ...initial, ...(JSON.parse(stored) as Partial<TravelPolicyInput>) } : initial;
  } catch {
    return initial;
  }
}

export function Component() {
  const { canConfigure, role } = useOperationalRole();
  const [config, setConfig] = useState<TravelPolicyInput>(() =>
    travelRepository ? initial : readPreview(),
  );
  const [loaded, setLoaded] = useState(!travelRepository);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!travelRepository) return;
    let cancelled = false;
    travelRepository
      .getPolicy()
      .then(({ data }) => {
        if (cancelled) return;
        setConfig({
          policyVersion: data.policyVersion,
          rateVersion: data.rateVersion,
          currency: data.currency,
          dailyRates: data.dailyRates,
          supportTemplate: data.supportTemplate,
          authorisationTemplate: data.authorisationTemplate,
          escalationDays: data.escalationDays,
        });
        setLoaded(true);
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setFailure(cause instanceof Error ? cause.message : 'Policy could not be loaded.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    if (!travelRepository) {
      sessionStorage.setItem(KEY, JSON.stringify(config));
      setSaved(true);
      return;
    }
    travelRepository
      .updatePolicy(config)
      .then(() => setSaved(true))
      .catch((cause: unknown) => {
        setSaved(false);
        setFailure(cause instanceof Error ? cause.message : 'Configuration was not saved.');
      });
  };
  const templateOptions = (current: string) =>
    (TEMPLATES.includes(current) ? TEMPLATES : [current, ...TEMPLATES]).map((item) => (
      <option key={item}>{item}</option>
    ));
  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Workflow configuration"
        meta={
          <>
            <Badge variant="outline">
              {travelRepository ? config.rateVersion : 'Draft configuration'}
            </Badge>
            <Badge variant="primary">Version {config.policyVersion}</Badge>
          </>
        }
      />
      {!canConfigure ? (
        <Notice variant="error" title="Configuration access restricted">
          {role} cannot change versioned workflow configuration.
        </Notice>
      ) : null}
      {failure ? (
        <Notice variant="error" title="Configuration problem">
          {failure}
        </Notice>
      ) : null}
      {saved ? (
        <Notice variant="success" title="Configuration saved">
          {travelRepository
            ? 'The new policy version applies to requests raised from now on.'
            : 'The preview configuration is retained for this browser session.'}
        </Notice>
      ) : null}
      <form className="grid gap-6 lg:grid-cols-2" onSubmit={submit}>
        <Panel title="Travel policy and rates">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Policy version
              <input
                className={inputClass}
                value={config.policyVersion}
                onChange={(e) =>
                  setConfig((value) => ({ ...value, policyVersion: e.target.value }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              Rate version
              <input
                className={inputClass}
                value={config.rateVersion}
                onChange={(e) => setConfig((value) => ({ ...value, rateVersion: e.target.value }))}
              />
            </label>
            <label className="text-sm font-medium">
              Base currency
              <input
                className={inputClass}
                value={config.currency}
                onChange={(e) => setConfig((value) => ({ ...value, currency: e.target.value }))}
              />
            </label>
            {BANDS.map((band) => (
              <label key={band} className="text-sm font-medium">
                {band} daily rate
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  value={config.dailyRates[band] ?? 0}
                  onChange={(e) =>
                    setConfig((value) => ({
                      ...value,
                      dailyRates: { ...value.dailyRates, [band]: Number(e.target.value) },
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </Panel>
        <Panel title="Documents and escalation">
          <div className="space-y-4">
            <label className="block text-sm font-medium">
              Default support template
              <select
                className={inputClass}
                value={config.supportTemplate}
                onChange={(e) =>
                  setConfig((value) => ({ ...value, supportTemplate: e.target.value }))
                }
              >
                {templateOptions(config.supportTemplate)}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Default authorisation template
              <select
                className={inputClass}
                value={config.authorisationTemplate}
                onChange={(e) =>
                  setConfig((value) => ({ ...value, authorisationTemplate: e.target.value }))
                }
              >
                {templateOptions(config.authorisationTemplate)}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Approval escalation window (days)
              <input
                className={inputClass}
                type="number"
                min="0"
                max="60"
                value={config.escalationDays}
                onChange={(e) =>
                  setConfig((value) => ({ ...value, escalationDays: Number(e.target.value) }))
                }
              />
            </label>
          </div>
        </Panel>
        <Panel title="Configured approval routes">
          <div className="space-y-3">
            {[
              'Outbound: Line manager → Senior approver',
              'Student outbound: Line manager → Student welfare (P&C) → Senior approver',
              'Inbound: Line manager → Senior approver → IR protocol clearance',
              'Material amendment: Invalidate prior decisions → Repeat applicable route',
            ].map((route) => (
              <div
                key={route}
                className="flex items-center gap-3 rounded-lg border border-border-subtle p-3"
              >
                <ShieldCheck size={18} className="shrink-0 text-primary" />
                <span className="text-sm font-medium">{route}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Evidence checklists">
          <div className="space-y-3">
            {[
              'Inbound: Passport, invitation or appointment letter, itinerary',
              'Staff travel: Invitation or business case, itinerary, funding confirmation',
              'Student outbound: Passport, itinerary, enrolment, funding, guardian consent',
            ].map((item) => (
              <div key={item} className="rounded-lg bg-surface-subtle p-3 text-sm">
                {item}
              </div>
            ))}
          </div>
        </Panel>
        <div className="lg:col-span-2 flex justify-end">
          <Button type="submit" disabled={!canConfigure || !loaded}>
            <Save size={17} />
            Save new configuration version
          </Button>
        </div>
      </form>
    </section>
  );
}
