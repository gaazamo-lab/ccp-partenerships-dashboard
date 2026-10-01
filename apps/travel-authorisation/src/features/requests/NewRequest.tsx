import { type FormEvent, type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router';

import { Badge, Button, Notice } from '@rfdtech/components';
import { Save } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { Panel } from '@/components/Panel';
import { ROUTES, requestRoute } from '@/constants/routes';
import { useOperationalRole } from '@/features/access/role-context';

import { validateRequest } from './domain';
import { useRequests } from './requests-context';
import type { NewTravelRequest, TravelDirection } from './types';

const initial: NewTravelRequest = {
  direction: 'Outbound',
  category: 'Official staff travel',
  traveller: '',
  purpose: '',
  destination: '',
  startDate: '',
  endDate: '',
};
const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) => (
  <label className="space-y-2 text-sm font-medium">
    <span>{label}</span>
    {children}
    {error ? <span className="block text-xs text-error">{error}</span> : null}
  </label>
);

export function Component() {
  const navigate = useNavigate();
  const { createRequest } = useRequests();
  const { canCreate, role } = useOperationalRole();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = (key: keyof NewTravelRequest, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateRequest(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    navigate(requestRoute(createRequest(form)));
  };
  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Create request"
        // description="Start an inbound support or outbound official travel workflow."
        backTo={{ to: ROUTES.REQUESTS, label: 'Back to requests' }}
        meta={<Badge variant="outline">Draft</Badge>}
      />
      {!canCreate ? (
        <Notice variant="error" title="Request creation restricted">
          {role} cannot create travel requests.
        </Notice>
      ) : null}
      <form className="grid gap-6 xl:grid-cols-[1fr_21rem]" onSubmit={submit} noValidate>
        <div className="space-y-6">
          <Panel
            title="Request type"
            // description="This choice controls evidence and approval routing."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {(['Outbound', 'Inbound'] as TravelDirection[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      direction: value,
                      category:
                        value === 'Inbound' ? 'Examiner visa support' : 'Official staff travel',
                    }))
                  }
                  className={`rounded-xl border p-4 text-left ${form.direction === value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border-subtle'}`}
                >
                  <p className="font-semibold">
                    {value === 'Inbound' ? 'Inbound visa support' : 'Outbound official travel'}
                  </p>
                  <p className="mt-1 text-sm text-foreground-muted">
                    {value === 'Inbound'
                      ? 'Institutional support for examiners, delegations or exchange students.'
                      : 'Policy-based authorisation and estimate for CLET staff.'}
                  </p>
                </button>
              ))}
            </div>
          </Panel>
          <Panel
            title="Traveller and purpose"
            // description="Use authoritative references where they are available."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Traveller name" error={errors.traveller}>
                <input
                  className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150"
                  value={form.traveller}
                  onChange={(e) => update('traveller', e.target.value)}
                />
              </Field>
              <Field label="Request category">
                <select
                  className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150"
                  value={form.category}
                  onChange={(e) => update('category', e.target.value)}
                >
                  {form.direction === 'Inbound' ? (
                    <>
                      <option>Examiner visa support</option>
                      <option>Delegation support</option>
                      <option>Exchange student support</option>
                    </>
                  ) : (
                    <>
                      <option>Official staff travel</option>
                      <option>Official delegation travel</option>
                    </>
                  )}
                </select>
              </Field>
              {form.direction === 'Inbound' ? (
                <Field label="Nationality" error={errors.nationality}>
                  <input
                    className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150"
                    value={form.nationality ?? ''}
                    onChange={(e) => update('nationality', e.target.value)}
                  />
                </Field>
              ) : null}
              <Field
                label={
                  form.direction === 'Inbound'
                    ? 'S083 delegation reference (optional)'
                    : 'S140 staff reference (optional)'
                }
              >
                <input
                  className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150"
                  value={form.sourceReference ?? ''}
                  onChange={(e) => update('sourceReference', e.target.value)}
                  placeholder={form.direction === 'Inbound' ? 'S083-DEL-…' : 'S140-EMP-…'}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Purpose" error={errors.purpose}>
                  <textarea
                    className="min-h-24 w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150"
                    value={form.purpose}
                    onChange={(e) => update('purpose', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </Panel>
          <Panel
            title="Journey"
            // description="Dates and destination changes after approval require reapproval."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Destination" error={errors.destination}>
                <input
                  className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150"
                  value={form.destination}
                  onChange={(e) => update('destination', e.target.value)}
                />
              </Field>
              {form.direction === 'Inbound' ? (
                <Field label="Host or institution">
                  <input
                    className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150"
                    value={form.host ?? ''}
                    onChange={(e) => update('host', e.target.value)}
                  />
                </Field>
              ) : (
                <div />
              )}
              <Field label="Start date" error={errors.startDate}>
                <input
                  className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update('startDate', e.target.value)}
                />
              </Field>
              <Field label="End date" error={errors.endDate}>
                <input
                  className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => update('endDate', e.target.value)}
                />
              </Field>
            </div>
          </Panel>
        </div>
        <aside className="space-y-4">
          <Panel title="Before you continue">
            <div className="space-y-3 text-sm text-foreground-muted">
              <p>The request is saved as a draft. Evidence is collected on the request record.</p>
              <p>Approval routing uses direction, staff hierarchy, seniority and policy version.</p>
              <p>A support letter never represents a visa decision.</p>
            </div>
          </Panel>
          {Object.keys(errors).length ? (
            <Notice variant="error" title="Check the form">
              Correct the highlighted fields before saving.
            </Notice>
          ) : null}
          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={!canCreate}>
              <Save size={17} />
              Save draft
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(ROUTES.REQUESTS)}>
              Cancel
            </Button>
          </div>
        </aside>
      </form>
    </section>
  );
}
