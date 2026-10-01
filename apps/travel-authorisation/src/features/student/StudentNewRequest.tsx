import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button, Notice } from '@rfdtech/components';
import { ArrowLeft, CheckCircle2, FileText, PlaneTakeoff, Send, UserRound } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';

import { ROUTES, studentRequestRoute } from '@/constants/routes';
import { validateRequest } from '@/features/requests/domain';
import { useRequests } from '@/features/requests/requests-context';
import type { NewTravelRequest } from '@/features/requests/types';

const NEXT_STEPS = [
  'Create your request',
  'Add the required documents',
  'Submit it for school review',
  'Wait for travel authorisation',
  'Confirm when you return',
];

export function Component() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createRequest } = useRequests();
  const [form, setForm] = useState<NewTravelRequest>({
    direction: 'Outbound',
    category: 'Student outbound travel',
    traveller: user?.name ?? '',
    purpose: '',
    destination: '',
    startDate: '',
    endDate: '',
    studentNumber: '',
    programme: '',
    level: '',
    sponsor: '',
    emergencyContact: '',
    returnDeclaration: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: keyof NewTravelRequest, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateRequest(form);
    if (!form.studentNumber?.trim()) found.studentNumber = 'Enter your student number.';
    if (!form.programme?.trim()) found.programme = 'Enter your programme.';
    if (!form.emergencyContact?.trim()) found.emergencyContact = 'Enter an emergency contact.';
    if (!form.returnDeclaration)
      found.returnDeclaration = 'Confirm that you will report your return.';
    setErrors(found);
    if (Object.keys(found).length) return;
    navigate(studentRequestRoute(createRequest(form)));
  };

  const field = (
    key: keyof NewTravelRequest,
    label: string,
    type = 'text',
    placeholder = '',
    optional = false,
  ) => (
    <label className="block text-[0.88rem] font-[650] text-[#303840]">
      <span className="mb-2 block">
        {label}{' '}
        <small className="text-xs font-[450] text-[#7a848e]">
          {optional ? '(Optional)' : '(Required)'}
        </small>
      </span>
      <input
        className={`w-full rounded-[0.65rem] border ${errors[key] ? 'border-[#d85656]' : 'border-border'} px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150`}
        type={type}
        placeholder={placeholder}
        value={String(form[key] ?? '')}
        onChange={(event) => update(key, event.target.value)}
      />
      {errors[key] ? (
        <em className="mt-1.4 block text-[0.72rem] font-[550] not-italic text-[#c93232]">
          {errors[key]}
        </em>
      ) : null}
    </label>
  );

  return (
    <section className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(ROUTES.STUDENT_HOME)}
        className="inline-flex items-center gap-1.6 text-sm font-semibold text-[#66727d] hover:text-[#076ca3]"
      >
        <ArrowLeft size={17} />
        Back to my travel
      </button>

      <div className="flex items-center gap-3.6">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#e3f5ff] text-[#076ca3]">
          <PlaneTakeoff size={23} />
        </span>
        <div>
          <h1 className="m-0 text-[clamp(1.6rem,3vw,2rem)] font-[750] tracking-tight text-[#20252b]">
            Make a travel request
          </h1>
          <p className="mt-1 text-[0.9rem] text-[#6b7280]">
            Provide the information the school needs to review your planned trip.
          </p>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]"
        noValidate
      >
        <div className="overflow-hidden rounded-xl border border-[#dfe5ea] bg-white shadow-[0_2px_8px_rgba(22,34,45,0.045)]">
          <header className="flex items-center justify-between gap-4 bg-[linear-gradient(to_right,#072942,#025491)] px-6 py-5 text-white max-sm:p-4.6">
            <div>
              <h2 className="m-0 text-[1.15rem] font-[750]">Travel authorisation request</h2>
              <p className="mt-1.2 text-[0.82rem] text-white/[0.74]">
                Complete all required fields before creating your request.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-white/30 bg-white/[0.08] px-2.8 py-1.4 text-[0.72rem] font-bold">
              Outbound travel
            </span>
          </header>

          <div className="p-6 max-sm:p-4.6">
            <section aria-labelledby="student-information-heading">
              <div className="mb-5 flex items-start gap-2.8">
                <span className="grid h-8.5 w-8.5 shrink-0 place-items-center rounded-[0.55rem] bg-[#eaf5fc] text-[#076ca3]">
                  <UserRound size={19} />
                </span>
                <div>
                  <h3
                    id="student-information-heading"
                    className="m-0 text-[0.98rem] font-bold text-[#20252b]"
                  >
                    Student information
                  </h3>
                  <p className="mt-0.8 text-[0.78rem] text-[#6b7280]">
                    We will check this against your student record.
                  </p>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {field('traveller', 'Full name')}
                {field('studentNumber', 'Student number', 'text', 'e.g. LLB/2024/0012')}
                {field('programme', 'Programme', 'text', 'e.g. Professional Law Course')}
                {field('level', 'Level / year', 'text', 'e.g. Part 1', true)}
              </div>
            </section>

            <section
              className="mt-8 border-t border-[#e4e9ed] pt-8"
              aria-labelledby="travel-details-heading"
            >
              <div className="mb-5 flex items-start gap-2.8">
                <span className="grid h-8.5 w-8.5 shrink-0 place-items-center rounded-[0.55rem] bg-[#eaf5fc] text-[#076ca3]">
                  <PlaneTakeoff size={19} />
                </span>
                <div>
                  <h3
                    id="travel-details-heading"
                    className="m-0 text-[0.98rem] font-bold text-[#20252b]"
                  >
                    Travel details
                  </h3>
                  <p className="mt-0.8 text-[0.78rem] text-[#6b7280]">
                    Your dates must include the day you expect to return to school.
                  </p>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {field('destination', 'Country and city', 'text', 'e.g. London, United Kingdom')}
                {field('sponsor', 'Who is funding the trip?', 'text', 'e.g. Self-funded', true)}
                {field('startDate', 'Departure date', 'date')}
                {field('endDate', 'Expected return date', 'date')}
                <label className="block text-[0.88rem] font-[650] text-[#303840] sm:col-span-2">
                  <span className="mb-2 block">
                    Reason for travel{' '}
                    <small className="text-xs font-[450] text-[#7a848e]">(Required)</small>
                  </span>
                  <textarea
                    className={`min-h-32 w-full resize-y rounded-[0.65rem] border ${errors.purpose ? 'border-[#d85656]' : 'border-border'} px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150`}
                    value={form.purpose}
                    onChange={(event) => update('purpose', event.target.value)}
                    placeholder="Explain why you need to travel and how the trip relates to your studies."
                  />
                  {errors.purpose ? (
                    <em className="mt-1.4 block text-[0.72rem] font-[550] not-italic text-[#c93232]">
                      {errors.purpose}
                    </em>
                  ) : null}
                </label>
                {field('emergencyContact', 'Emergency contact', 'tel', 'Name and phone number')}
              </div>
            </section>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-28">
          <section className="overflow-hidden rounded-xl border border-[#dfe5ea] bg-white shadow-[0_2px_8px_rgba(22,34,45,0.045)]">
            <header className="flex items-center justify-between gap-4 px-5 py-4 max-sm:flex-col max-sm:items-start max-sm:p-4">
              <div>
                <h2 className="m-0 text-base font-bold text-[#20252b]">What happens next</h2>
                <p className="mt-1 text-[0.8rem] leading-[1.45] text-[#6b7280]">
                  Your request moves through five clear steps.
                </p>
              </div>
            </header>
            <ol className="m-0 list-none px-5 pb-4.4 pt-1.8">
              {NEXT_STEPS.map((step, index) => (
                <li
                  key={step}
                  className={`relative flex min-h-12 items-center gap-3 ${
                    index !== NEXT_STEPS.length - 1
                      ? "after:absolute after:left-3.5 after:top-8.75 after:-bottom-1.25 after:w-px after:bg-[#d8e1e7] after:content-['']"
                      : ''
                  }`}
                >
                  <span className="grid h-7.25 w-7.25 shrink-0 place-items-center rounded-full border border-[#c8d5dd] bg-[#f8fafb] text-[0.72rem] font-[750] text-[#076ca3]">
                    {index + 1}
                  </span>
                  <p className="text-[0.82rem] font-semibold text-[#44505b]">{step}</p>
                </li>
              ))}
            </ol>
          </section>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dfe5ea] bg-white p-4 shadow-[0_2px_8px_rgba(22,34,45,0.035)]">
            <input
              type="checkbox"
              checked={Boolean(form.returnDeclaration)}
              onChange={(event) => update('returnDeclaration', event.target.checked)}
              className="mt-0.48 h-4.25 w-4.25 shrink-0 accent-[#076ca3]"
            />
            <span>
              <strong className="block text-[0.82rem] text-[#303840]">
                I confirm this information is correct.
              </strong>
              <small className="mt-1 block text-[0.74rem] leading-[1.45] text-[#6b7280]">
                I will report my return before resuming school.
              </small>
            </span>
          </label>
          {errors.returnDeclaration ? (
            <p className="text-xs font-medium text-error">{errors.returnDeclaration}</p>
          ) : null}

          {Object.keys(errors).length ? (
            <Notice variant="error" title="Check your request">
              Complete the highlighted information before continuing.
            </Notice>
          ) : null}

          <Button
            type="submit"
            className="min-h-11.5 w-full !bg-[#076ca3] !text-white hover:!bg-[#075886]"
          >
            <Send size={17} />
            Create request
          </Button>
          <div className="flex items-start gap-2 px-1 text-xs leading-5 text-[#6b7280]">
            <FileText size={15} className="mt-0.5 shrink-0" />
            You can add document references after the request is created.
          </div>
          <div className="flex items-start gap-2 px-1 text-xs leading-5 text-[#6b7280]">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            Creating a draft does not submit it for approval.
          </div>
        </aside>
      </form>
    </section>
  );
}
